import mercadopago from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔐 Token carregado:', process.env.MERCADO_PAGO_ACCESS_TOKEN);

mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

export default mercadopago;