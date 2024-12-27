
const mailgun = require("mailgun-js");

// Configure sua API Key e domínio
const DOMAIN = "sandbox-123.mailgun.org"; // Substitua pelo seu domínio Mailgun

// Substitua pela sua API Key do Mailgun
const apiKey = "1057072c8d327531b672ebac65de0a5a-c02fd0ba-ea573078";



// Inicialize o Mailgun
const mg = mailgun({ apiKey: apiKey, domain: DOMAIN });

// Função para enviar e-mail
const enviarEmail = () => {
  const data = {
    from: "Seu Nome <seuemail@sandbox-123.mailgun.org>",
    to: "destinatario@exemplo.com",
    subject: "Novo Pedido de Cotação",
    text: "Você recebeu um novo pedido de cotação.",
    html: `
      <h1>Pedido de Cotação</h1>
      <p>Olá! Confira os detalhes do pedido no painel administrativo.</p>
    `
  };

  // Envia o e-mail
  mg.messages().send(data, (error, body) => {
    if (error) {
      console.error("Erro ao enviar o e-mail:", error);
    } else {
      console.log("E-mail enviado com sucesso:", body);
    }
  });
};

// Execute a função para enviar e-mail
enviarEmail();
