import ContentPage from "@/components/ContentPage";

export default function PrivacidadePage() {
  return (
    <ContentPage
      eyebrow="Privacidade"
      title="Política de Privacidade"
      description="Privacidade aqui não é slogan de rodapé. É uma restrição de arquitetura: coletar o mínimo, reter o mínimo e expor o mínimo."
      color="#00ff9d"
      updatedAt="7 de março de 2026"
      sections={[
        {
          title: "Dados que tratamos",
          paragraphs: [
            "Tratamos apenas os dados necessários para operar o serviço, como email informado no checkout, metadados técnicos de requisição, dados mínimos de pagamento e informações operacionais de segurança.",
            "Quando a ferramenta roda integralmente no navegador, o arquivo permanece no dispositivo durante o processamento local. Quando você pede link seguro ou fluxo autenticado, o upload temporário existe para viabilizar download autorizado, compartilhamento controlado ou continuidade do processo.",
          ],
        },
        {
          title: "Finalidade e retenção",
          paragraphs: [
            "Usamos os dados para processar operações, validar pagamento, liberar downloads, prevenir abuso, responder suporte e manter a estabilidade do produto.",
            "Uploads temporários, tokens de autorização e registros operacionais seguem retenção limitada. O objetivo é utilidade transitória, não acúmulo de histórico por inércia.",
          ],
        },
        {
          title: "Compartilhamento e limites",
          paragraphs: [
            "Compartilhamos dados apenas com serviços estritamente necessários para operar o produto, como gateway de pagamento, envio de email transacional e armazenamento temporário acionado pelo próprio fluxo.",
            "Não vendemos dados, não montamos perfil publicitário a partir do seu uso e não transformamos comportamento operacional em inventário de anúncio. O que não serve para operar, proteger ou cumprir obrigação legítima não deveria ser coletado.",
          ],
        },
        {
          title: "Solicitações e contato",
          paragraphs: [
            <>
              Para dúvidas sobre tratamento de dados, exclusão de informações
              operacionais dentro do que for aplicável ou contato institucional,
              use{" "}
              <a
                href="mailto:neo@neoprotocol.space"
                style={{ color: "var(--neo-green)", textDecoration: "none" }}
              >
                neo@neoprotocol.space
              </a>
              .
            </>,
            "Alguns registros podem precisar ser mantidos temporariamente por obrigação operacional, antifraude, financeira ou de segurança. Privacidade séria também sabe onde a retenção mínima ainda é necessária.",
          ],
        },
      ]}
    />
  );
}
