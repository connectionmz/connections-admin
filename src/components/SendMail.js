import axios from 'axios';

const sendEmail = async (to, companyName, action, motivo = "", nota = "") => {
  let subject, textContent;

  if (action === "validar") {
    subject = 'Ativação de Conta';
    textContent = `
      Olá ${companyName},

      Sua conta foi ativada com sucesso! Agora você pode acessar todos os recursos da nossa plataforma.

      Para começar, acesse: https://app.connectionmozambique.com/auth

      Caso tenha alguma dúvida ou precise de suporte, entre em contato connosco.

      Atenciosamente,
      Equipe de Suporte
      suporte@connectionmozambique.com
    `;
  } else if (action === "invalidar") {
    subject = 'Conta Invalidada';
    textContent = `
      Olá ${companyName},

      Infelizmente, sua conta foi invalidada pelos seguintes motivos:
      - Motivo: ${motivo}
      - Nota: ${nota}

      Caso acredite que isso seja um erro ou precise de mais informações, entre em contato connosco.

      Atenciosamente,
      Equipe de Suporte
      suporte@connectionmozambique.com
    `;
  } else {
    console.error("Ação inválida. Use 'validar' ou 'invalidar'.");
    return false;
  }

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