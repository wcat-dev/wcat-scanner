import gql from "graphql-tag";

export const payments = gql`
  """
  Payment plan handled by stripe.
  """
  type PaymentPlan {
    id: String
    object: String
    active: Boolean
    amount: Int
    amount_decimal: String
    nickname: String
    currency: String
    interval: String
    product: String
  }

  """
  Payment sub handled by stripe.
  """
  type PaymentSubScription {
    id: String
    object: String
    application_fee_percent: Int
    billing_cycle_anchor: Int
    cancel_at_period_end: Boolean
    customer: String
    ended_at: String
    canceled_at: String
    status: String
    start_date: String
    plan: PaymentPlan
    days_until_due: String
    current_period_end: String
    current_period_start: String
    created: String
    collection_method: String
  }
`;
