    const lastName = lastNameRaw.join(' ').trim() || undefined;

    const payload: Record<string, unknown> = {
      amount: amountValue.toFixed(2),
      currency: request.amount.currency,
      tx_ref: txRef,
      callback_url: callbackUrl,
      return_url: returnUrl,
      customization: {
        title:
          request.metadata?.paymentType === 'xhovile_studio_service'
            ? 'Xhovilé Studio'
            : 'BuyMesho Checkout',
        description:
          request.metadata?.paymentType === 'xhovile_studio_service'
            ? String(request.metadata.description ?? 'Xhovilé Studio service payment')
            : `Payment for order ${request.orderId}`,
      },
      meta: serializeMeta(request.metadata),
    };

    if (request.customer.email) {
      payload.email = request.customer.email;
    }
    if (firstName) {
      payload.first_name = firstName;
    }
    if (lastName) {
      payload.last_name = lastName;
    }

    const response = await fetch(`${baseUrl}/payment`, {
      method: 'POST',
      headers: buildPayChanguJsonHeaders(config),
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as PayChanguPaymentInitResponse;

    if (!response.ok) {
      throw new Error(buildPayChanguFailureMessage(data));
    }

    const sessionData = data.data?.data ?? data.data;
    const checkoutUrl = data.data?.checkout_url ?? data.data?.checkoutUrl ?? null;
    const returnedTxRef = sessionData?.tx_ref ?? sessionData?.txRef;
    const providerReference = sessionData?.id ?? sessionData?.reference ?? null;

    return {
      id: randomUUID(),
      orderId: request.orderId,
      provider: 'paychangu',
      method: request.method,
      status: 'pending',
      amount: request.amount,
      reference: returnedTxRef ?? txRef,
      providerReference,
      checkoutUrl,
      paidAt: null,
      rawResponse: data as Record<string, unknown>,
      createdAt: toISODate(),
      updatedAt: toISODate(),