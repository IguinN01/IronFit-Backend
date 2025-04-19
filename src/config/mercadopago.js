import pkg from 'mercadopago';
const mercadopago = pkg.default || pkg;

mercadopago.configure({
  access_token: "TEST-2223438209198426-040908-597c267bfdabae5f2befb939a4ac8d4d-1185888193"
});

export default mercadopago;