import axios from "axios";

const sendEmail = async (emailData) => {
  try {
    const response = await axios.post('https://mohvi-sendmail.vercel.app/send-email', emailData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.status) {
      console.log('E-mail enviado com sucesso para:', emailData.to);
      return true;
    } else {
      console.error('Erro no servidor de email:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('Erro ao enviar o e-mail:', error.response?.data?.message || error.message);
    return false;
  }
};

export default sendEmail;