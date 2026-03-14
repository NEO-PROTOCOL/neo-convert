import ContentPage from "@/components/ContentPage";

export default function SobrePage() {
  return (
    <ContentPage
      eyebrow="NeoConvert"
      title="Sobre o NEO Convert"
      description="O NEO Convert é um sistema de conversão e automação financeira projetado para simplificar a forma como empresas e criadores lidam com pagamentos digitais."
      color="#00ff9d"
      updatedAt="7 de março de 2026"
      cta={{ label: "Ver ferramentas", href: "/#tools" }}
      sections={[
        {
          title: "Visão geral",
          paragraphs: [
            "A plataforma conecta camadas de pagamento, automação e infraestrutura blockchain em um único fluxo operacional.",
            "Na prática, isso permite transformar ações financeiras em processos automáticos, rastreáveis e auditáveis.",
            "Nosso objetivo é reduzir fricção entre pagamento, conversão e execução digital.",
            "Sem burocracia.",
            "Sem dependência de múltiplas plataformas.",
          ],
        },
        {
          title: "Infraestrutura",
          paragraphs: [
            <>
              O NEO Convert faz parte de um ecossistema tecnológico maior
              desenvolvido pela{" "}
              <a
                href="https://flowoff.xyz"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--neo-green)", textDecoration: "none" }}
              >
                NEO FlowOFF
              </a>
              , uma agência especializada na criação de sistemas digitais e
              automações para negócios que operam entre Web2 e Web3.
            </>,
            "A FlowOFF atua na arquitetura de sistemas de pagamento, automação de marketing e vendas, integrações entre APIs financeiras e infraestrutura blockchain com tokenização.",
            "Essa base tecnológica permite que o NEO Convert opere com uma arquitetura orientada a automação e escalabilidade.",
          ],
        },
        {
          title: "Arquitetura",
          paragraphs: [
            "O sistema foi projetado com três princípios: automação, transparência e independência.",
            "Automação significa que processos financeiros devem acontecer sem intervenção manual.",
            "Transparência significa que todas as operações seguem lógica rastreável e verificável.",
            "Independência significa que negócios não devem depender de múltiplas plataformas para operar.",
          ],
        },
        {
          title: "Nosso papel",
          paragraphs: [
            "O NEO Convert não é apenas uma ferramenta.",
            <>
              Ele é um nó operacional dentro de uma infraestrutura maior de
              automação financeira e digital construída pela{" "}
              <a
                href="https://flowoff.xyz"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--neo-green)", textDecoration: "none" }}
              >
                NEO FlowOFF
              </a>
              .
            </>,
            "Esse modelo permite que novos serviços, integrações e funcionalidades evoluam sem interromper o funcionamento do sistema.",
          ],
        },
        {
          title: "Segurança e continuidade",
          paragraphs: [
            "A plataforma é mantida por uma equipe com experiência em arquitetura de sistemas, automação de marketing, infraestrutura cloud, integrações financeiras e desenvolvimento blockchain.",
            "Nosso foco é garantir estabilidade operacional e evolução contínua da plataforma.",
          ],
        },
      ]}
    />
  );
}
