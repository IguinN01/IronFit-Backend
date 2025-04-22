import nodemailer from 'nodemailer';

export const enviarEmail = async (para, assunto, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_REMETENTE,
      pass: process.env.EMAIL_SENHA_APP
    }
  });

  const mailOptions = {
    from: `"IronFit" <${process.env.EMAIL_REMETENTE}>`,
    to: para,
    subject: assunto,
    html
  };

  await transporter.sendMail(mailOptions);
};