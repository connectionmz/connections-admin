import axios from 'axios';

const sendEmail = async (to, companyName) => {
  const subject = 'Ativação de Conta';

  const textContent = `
    Olá ${companyName},

    Sua conta foi ativada com sucesso! Agora você pode acessar todos os recursos da nossa plataforma.

    Para começar, acesse: https://app.connectionmozambique.com

    Caso tenha alguma dúvida ou precise de suporte, entre em contato connosco.

    Atenciosamente,
    Equipe de Suporte
    suporte@connectionmozambique.com
  `;

  const emailData = {
    to,
    subject,
    text: textContent, 
  };

  try {
    const response = await axios.post('https://mohvi-sendmail.vercel.app/send-email', emailData);
    console.log('E-mail enviado com sucesso:', response.data);
    return true;
  } catch (error) {
    console.error('Erro ao enviar o e-mail:', error);
    return false;
  }
};

export default sendEmail;
