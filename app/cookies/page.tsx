import ContentPage from "@/components/ContentPage";

export default function CookiesPage() {
  return (
    <ContentPage
      eyebrow="Cookies"
      title="Política de Cookies"
      description="Usamos o mínimo necessário para lembrar escolhas, liberar recursos temporários e, com consentimento explícito, medir uso e desempenho."
      color="#a87aff"
      updatedAt="7 de março de 2026"
      sections={[
        {
          title: "O que fica salvo",
          paragraphs: [
            "Salvamos preferências locais como consentimento de cookies, autorizações temporárias de download e franquias gratuitas por dispositivo quando aplicável.",
            "Esses dados existem para reduzir fricção operacional e não para montar um perfil comportamental ornamental.",
          ],
        },
        {
          title: "Medição com consentimento",
          paragraphs: [
            "Métricas de analytics e performance só são habilitadas quando você aceita o banner de consentimento.",
            "Se você escolher apenas o essencial, o produto continua funcional sem carregar a camada analítica opcional.",
          ],
        },
        {
          title: "Como alterar sua escolha",
          paragraphs: [
            "Você pode limpar os dados locais do navegador para redefinir sua decisão de consentimento e demais preferências salvas no dispositivo.",
            "Se estiver em ambiente corporativo ou navegador gerenciado, a política local da organização pode interferir nesse armazenamento.",
          ],
        },
      ]}
    />
  );
}
