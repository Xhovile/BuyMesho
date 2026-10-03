import type { Express, Response } from "express";
import {
  createEventTicketDownloadResponse,
  verifyEventTicketDownloadToken,
} from "./event-ticket-download.js";

type RouteDeps = {
  db: any;
};

export function registerEventTicketDownloadRoutes(app: Express, { db }: RouteDeps) {
  app.get("/api/event-tickets/:ticketId/download", (req, res) => {
    const ticketId = String(req.params.ticketId ?? "").trim();
    const token = typeof req.query.token === "string" ? req.query.token : "";

    if (!ticketId || !verifyEventTicketDownloadToken(ticketId, token)) {
      res.status(403).json({ error: "Invalid or expired ticket download link." });
      return;
    }

    try {
      const ticket = db
        .prepare(
          `SELECT
             et.id,
             et.code,
             et.ticket_title,
             et.ticket_type,
             et.holder_name,
             et.holder_email,
             et.holder_phone,
             et.status,
             et.event_title,
             et.event_date,
             et.start_time,
             et.venue,
             et.location,
             et.purchase_date,
             et.order_id,
             e.organizer_name,
             e.ticket_price,
             o.status AS order_status
           FROM event_tickets et
           LEFT JOIN events e ON e.id = et.event_id
           LEFT JOIN orders o ON o.id = et.order_id
          WHERE et.id = ? OR et.code = ?
          LIMIT 1`,
        )
        .get(ticketId, ticketId) as Record<string, unknown> | undefined;

      if (!ticket) {
        res.status(404).json({ error: "Ticket not found." });
        return;
      }

      return createEventTicketDownloadResponse(
        {
          ...ticket,
          ticket_title: ticket.ticket_title,
          organizer_name: ticket.organizer_name,
          status:
            String(ticket.order_status ?? "").toLowerCase() === "paid"
              ? "Paid"
              : String(ticket.status ?? "Pending"),
          amount:
            ticket.ticket_price !== undefined && ticket.ticket_price !== null
              ? `${ticket.ticket_price} MWK`
              : "",
        },
        res as Response,
      );
    } catch (error) {
      console.error("Event ticket PDF download failed:", error);
      res.status(500).json({ error: "Could not generate the ticket PDF." });
    }
  });
}
