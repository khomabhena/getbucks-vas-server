export const paymentCallback = async (req, res) => {
  res.status(401).json({ code: 'FAILED'});
  //res.status(200).json({ code: 'SUCCESS' });
};
