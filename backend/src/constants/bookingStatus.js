const STATUS = {
  EN_ATTENTE: 'EN_ATTENTE',
  VALIDEE: 'VALIDEE',
  PAYEE: 'PAYEE',
  REFUSEE: 'REFUSEE',
  EXPIREE: 'EXPIREE',
  ANNULEE: 'ANNULEE',
  TERMINEE: 'TERMINEE',
};

const STATUS_LABELS = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validée',
  PAYEE: 'Payée',
  REFUSEE: 'Refusée',
  EXPIREE: 'Expirée',
  ANNULEE: 'Annulée',
  TERMINEE: 'Terminée',
};

const ACTIVE_STATUSES = [STATUS.EN_ATTENTE, STATUS.VALIDEE, STATUS.PAYEE];

const MIN_HOURS = 1;
const MAX_HOURS = 12;
const PAYMENT_DEADLINE_HOURS = 48;
const CANCELLATION_MIN_DAYS = 7;

const EVENT_TYPES = [
  'Mariage',
  'Anniversaire',
  'Réunion',
  'Séminaire',
  'Conférence',
  'Autre',
];

module.exports = {
  STATUS,
  STATUS_LABELS,
  ACTIVE_STATUSES,
  MIN_HOURS,
  MAX_HOURS,
  PAYMENT_DEADLINE_HOURS,
  CANCELLATION_MIN_DAYS,
  EVENT_TYPES,
};
