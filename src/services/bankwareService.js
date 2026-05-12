export const getBankWareTokenCredentials = () => ({
  grant_type: process.env.BANKWARE_GRANT_TYPE || 'password',
  username: process.env.BANKWARE_USERNAME || '',
  password: process.env.BANKWARE_PASSWORD || '',
  systemId: process.env.BANKWARE_SYSTEM_ID || '',
});
