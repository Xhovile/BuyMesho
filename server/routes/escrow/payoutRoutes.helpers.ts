// Compatibility barrel for the payout route helpers.
// Keep route imports stable while the implementation is split by responsibility.
export * from './payoutRoutes.helpers.core.js';
export {
  addDestinationEvent,
  createDestinationRecord,
  findDestinationDuplicate,
  updateDestinationRecord,
} from './payoutRoutes.helpers.destinations.js';
export {
  findDestinationByIdPublic as findDestinationById,
  listSellerDestinations,
} from './payoutRoutes.helpers.destination-queries.js';
export { listSellerPayoutOperationalView } from './payoutRoutes.helpers.operational.js';
