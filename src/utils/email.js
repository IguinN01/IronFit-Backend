import nodemailer from 'nodemailer';

export const enviarEmail = async (para, assunto, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"IronFit" <${process.env.EMAIL_USER}>`,
    to: para,
    subject: assunto,
    html
  };

  await transporter.sendMail(mailOptions);
};