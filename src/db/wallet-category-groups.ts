import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from ".";
import { categories, type CategoryType } from "./schema";

export const WALLET_GROUP_EXTERNAL_PREFIX = "wallet_group:";

type WalletGroup = {
  id: string;
  name: string;
  namePt: string;
  type: CategoryType;
  categoryNames: string[];
};

/**
 * Wallet exposes a group on each base category. The local schema models that
 * as a synthetic parent category so reports can use the same parent/child
 * rendering as custom Wallet subcategories.
 */
const WALLET_GROUPS: WalletGroup[] = [
  {
    id: "financial_expenses",
    name: "Financial expenses",
    namePt: "Despesas Financeiras",
    type: "expense",
    categoryNames: ["Advisory", "Despesas Financeiras", "Insurances", "Taxas", "Taxes"],
  },
  {
    id: "food_and_drinks",
    name: "Food & Drinks",
    namePt: "Comidas e Bebidas",
    type: "expense",
    categoryNames: ["Bar e Café", "Groceries", "Restaurantes"],
  },
  {
    id: "housing",
    name: "Housing",
    namePt: "Moradia",
    type: "expense",
    categoryNames: ["Manutenção e Reparos", "Mortgage", "Services"],
  },
  {
    id: "income",
    name: "Income",
    namePt: "Receitas",
    type: "income",
    categoryNames: [
      "Juros e Dividendos",
      "Other income",
      "Reembolsos (Imposto, Compra)",
      "Renda de Aluguel",
      "Salary",
      "Sale",
    ],
  },
  {
    id: "investments",
    name: "Investments",
    namePt: "Investimentos",
    type: "expense",
    categoryNames: ["Investimentos Financeiros", "Veículos ou Bens Móveis"],
  },
  {
    id: "life_entertainment",
    name: "Life & Entertainment",
    namePt: "Vida e Entretenimento",
    type: "expense",
    categoryNames: [
      "Assinaturas e Streaming",
      "Bem-estar e Cuidados",
      "Caridade e Presentes",
      "Cultura e Eventos",
      "Educação e Conhecimento",
      "Esporte/Fitness",
      "Hobbies",
      "Livros e Áudio",
      "Saúde e Médicos",
      "Vida e entretenimento",
    ],
  },
  {
    id: "communication_pc",
    name: "PC, Communication",
    namePt: "Computador e Comunicação",
    type: "expense",
    categoryNames: ["Software e Jogos", "Telefonia"],
  },
  {
    id: "shopping",
    name: "Shopping",
    namePt: "Compras",
    type: "expense",
    categoryNames: [
      "Animais de Estimação",
      "Casa",
      "Compras",
      "Drugstore",
      "Eletrônicos e Acessórios",
      "Free time",
      "Jóias e Acessórios",
      "Papelaria e Ferramentas",
      "Presentes",
      "Saúde e Cuidados Pessoais",
      "Vestuário e Calçados",
    ],
  },
  {
    id: "transportation",
    name: "Transportation",
    namePt: "Transporte",
    type: "expense",
    categoryNames: ["Taxi", "Vôos"],
  },
  {
    id: "vehicle",
    name: "Vehicle",
    namePt: "Veículo",
    type: "expense",
    categoryNames: ["Fuel", "Manutenção de Veículos", "Parking", "Seguro do Veículo", "Veículo"],
  },
  {
    id: "others",
    name: "Others",
    namePt: "Outros",
    type: "expense",
    categoryNames: ["Other"],
  },
  {
    id: "system_categories",
    name: "System categories",
    namePt: "Categorias do Sistema",
    type: "expense",
    categoryNames: ["Transfer"],
  },
];

export function isWalletGroupCategory(category: { externalId?: string | null }): boolean {
  return category.externalId?.startsWith(WALLET_GROUP_EXTERNAL_PREFIX) ?? false;
}

/**
 * Idempotently creates Wallet group parents and attaches matching local base
 * categories. Existing parent assignments are preserved.
 */
export async function ensureWalletCategoryGroups(): Promise<void> {
  const db = getDb();

  for (const group of WALLET_GROUPS) {
    const children = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.isSystem, false), inArray(categories.name, group.categoryNames)),
      );
    if (children.length === 0) continue;

    const externalId = `${WALLET_GROUP_EXTERNAL_PREFIX}${group.id}`;
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.externalSource, "wallet_mcp"),
          eq(categories.externalId, externalId),
        ),
      )
      .limit(1);

    const parent =
      existing ??
      (
        await db
          .insert(categories)
          .values({
            name: group.name,
            nameEn: group.name,
            namePt: group.namePt,
            type: group.type,
            isSystem: true,
            externalSource: "wallet_mcp",
            externalId,
          })
          .returning({ id: categories.id })
      )[0];

    await db
      .update(categories)
      .set({ parentId: parent.id })
      .where(
        and(
          eq(categories.isSystem, false),
          isNull(categories.parentId),
          inArray(categories.name, group.categoryNames),
        ),
      );
  }
}
