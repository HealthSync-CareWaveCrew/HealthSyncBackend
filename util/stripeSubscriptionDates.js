const toDate = (unixSeconds) => {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
};

export const getStripeSubscriptionPeriodDates = (subscription) => {
  const item = subscription?.items?.data?.[0];
  const currentPeriodStart =
    subscription?.current_period_start ?? item?.current_period_start;
  const currentPeriodEnd =
    subscription?.current_period_end ?? item?.current_period_end;

  return {
    currentPeriodStart: toDate(currentPeriodStart),
    currentPeriodEnd: toDate(currentPeriodEnd),
  };
};
