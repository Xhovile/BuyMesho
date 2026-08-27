// Compatibility barrel for the payout route helpers.
// Keep route imports stable while the implementation is split by responsibility.
export * from './payoutRoutes.helpers.core.js';
export {
  addDestinationEvent,
  createDestinationRecord,
  findDestinationByIdPublic as findDestinationById,
  findDestinationDuplicate,
  listSellerDestinations,
  updateDestinationRecord,
} from './payoutRoutes.helpers.destinations.js';
export { listSellerPayoutOperationalView } from './payoutRoutes.helpers.operational.js';
