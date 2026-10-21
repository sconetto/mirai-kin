export type CategoryTranslation = { en: string; pt: string };

export const CATEGORY_TRANSLATIONS: CategoryTranslation[] = [
  { en: "Advisory", pt: "Consultoria" },
  { en: "Free Time", pt: "Tempo Livre" },
  { en: "Financial Investments", pt: "Investimentos Financeiros" },
  { en: "Maintenance & Repairs", pt: "Manutenção e Reparos" },
  { en: "Rental Income", pt: "Renda de Aluguel" },
  { en: "Services", pt: "Serviços" },
  { en: "Pets", pt: "Animais de Estimação" },
  { en: "Subscriptions & Streaming", pt: "Assinaturas e Streaming" },
  { en: "Bars & Cafés", pt: "Bar e Café" },
  { en: "Wellness & Care", pt: "Bem-estar e Cuidados" },
  { en: "Charity & Gifts", pt: "Caridade e Presentes" },
  { en: "Car & Motorcycle", pt: "Carro e Moto" },
  { en: "Home", pt: "Casa" },
  { en: "Food & Drinks", pt: "Comidas e bebidas" },
  { en: "Shopping", pt: "Compras" },
  { en: "Culture & Events", pt: "Cultura e Eventos" },
  { en: "Financial Fees", pt: "Despesas Financeiras" },
  { en: "Dining", pt: "Restaurantes" },
  { en: "Drugstore", pt: "Farmácia" },
  { en: "Education & Knowledge", pt: "Educação e Conhecimento" },
  { en: "Electronics & Accessories", pt: "Eletrônicos e Acessórios" },
  { en: "Sports & Fitness", pt: "Esporte/Fitness" },
  { en: "Fuel", pt: "Combustível" },
  { en: "Groceries", pt: "Mercado" },
  { en: "Health", pt: "Saúde" },
  { en: "Hobbies", pt: "Hobbies" },
  { en: "Housing", pt: "Moradia" },
  { en: "Insurance", pt: "Seguros" },
  { en: "Jewelry & Accessories", pt: "Jóias e Acessórios" },
  { en: "Books & Audio", pt: "Livros e Áudio" },
  { en: "Vehicle Maintenance", pt: "Manutenção de Veículos" },
  { en: "Mortgage", pt: "Financiamento Imobiliário" },
  { en: "Other", pt: "Outros" },
  { en: "Stationery & Tools", pt: "Papelaria e Ferramentas" },
  { en: "Parking", pt: "Estacionamento" },
  { en: "Gifts", pt: "Presentes" },
  { en: "Restaurants", pt: "Restaurantes" },
  { en: "Health & Personal Care", pt: "Saúde e Cuidados Pessoais" },
  { en: "Health & Medical", pt: "Saúde e Médicos" },
  { en: "Vehicle Insurance", pt: "Seguro do Veículo" },
  { en: "Software & Games", pt: "Software e Jogos" },
  { en: "Subscriptions", pt: "Assinaturas" },
  { en: "Fees", pt: "Taxas" },
  { en: "Taxes", pt: "Impostos" },
  { en: "Taxi", pt: "Táxi" },
  { en: "Phone", pt: "Telefonia" },
  { en: "Transfer", pt: "Transferência" },
  { en: "Transport", pt: "Transporte" },
  { en: "Clothing & Footwear", pt: "Vestuário e Calçados" },
  { en: "Vehicle", pt: "Veículo" },
  { en: "Vehicles & Movable Assets", pt: "Veículos ou Bens Móveis" },
  { en: "Life & Entertainment", pt: "Vida e entretenimento" },
  { en: "Flights", pt: "Voos" },
  { en: "Income", pt: "Receitas" },
  { en: "Interest & Dividends", pt: "Juros e Dividendos" },
  { en: "Other income", pt: "Outras receitas" },
  { en: "Others", pt: "Outros" },
  { en: "Refunds (Tax, Purchase)", pt: "Reembolsos (Imposto, Compra)" },
  { en: "Earnings", pt: "Rendimentos" },
  { en: "Salary", pt: "Salário" },
  { en: "Sale", pt: "Venda" },
  { en: "Salary & Invoices", pt: "Salário e Faturas" },
];

const lookup = new Map<string, CategoryTranslation>();
for (const translation of CATEGORY_TRANSLATIONS) {
  lookup.set(translation.en.trim().toLowerCase(), translation);
  lookup.set(translation.pt.trim().toLowerCase(), translation);
}

const ALIASES: Record<string, string> = {
  insurances: "insurance",
  "vôos": "voos",
  voos: "voos",
};

export function categoryTranslation(name: string): CategoryTranslation | null {
  const key = name.trim().toLowerCase();
  return lookup.get(ALIASES[key] ?? key) ?? null;
}
