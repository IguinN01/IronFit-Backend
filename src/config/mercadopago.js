import mercadopago from 'mercadopago';

mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_TOKEN,
});

export default mercadopago;