# Oba Green — Full App Extraction (for Wireframes & Next.js Rewrite)

> "Oba Green" is an **internal order-management desktop tool** (currently Electron + React + Express + MongoDB). It manages **Batches** (groups of orders over a date window), **Orders** (a client's request of multiple products), and **Products** (with unit conversions). The whole UI is in **Portuguese (pt-BR)**. Auth is admin-only.

This document describes **every page, every field, every action, and the data behind them** so you can build wireframes and a Next.js rewrite.

---

## 0. Quick orientation

| Concept | What it is |
|---|---|
| **Lote (Batch)** | A numbered group of orders spanning a start→end date. Auto-numbered sequentially (001, 002, …). |
| **Pedido (Order)** | One client's request inside a batch. Has a creation date, a delivery date, and a list of items (product + amount + unit). |
| **Produto (Product)** | A catalog item with a primary unit and optional unit conversions (e.g. 1 kg = 10 un). |
| **Unidade de medida (Unit)** | Measurement unit. Each order line can use the product's default unit or any of its conversions. |
| **Resumo / Sumário** | Aggregations computed from a batch's orders: total per product ("Geral"), broken down by product, or by client. Exportable to Excel. |

### Navigation / app shell
- A left **vertical sidebar** with 4 icon buttons: **Lotes (Batches)**, **Pedidos (Orders)**, **Produtos (Products)**, and **Logout** (bottom). The active tab is highlighted; the tab stays highlighted when you're inside a related detail/edit page.
- A custom window **title bar** (minimize / maximize-restore / close) — desktop only; **not needed in a web/Next.js app**.
- No URL routing today — state-based navigation via a context (`NavContext`). In Next.js this becomes real routes (see suggestions at the bottom of each page).

### Visual language (carry into wireframes)
- Font: **Poppins**.
- Colors (SCSS `pallete`):
  - Primary green `#265948`, darker `#132d24`, light `#47846f`
  - Accent red `#df3d0a` (used for destructive/cancel)
  - Off-white `#fffde9`, grays `#afafaf` / `#2b2b2b`, near-black `#081c15`
- Inputs: **borderless**, only a **bottom border** (2px gray → green on focus), large text, no spinners on number inputs.
- Reusable UI: `Card`, `Chip` (small pill/tag), `Table` (header uppercase, last column is an edit pencil when editable), round icon buttons `ButtonRound` (cancel/ok/add/download/filter), `ButtonSwitch` (segmented control), `Modal`, `Loader`.
- Dates always formatted `pt-BR` (dd/mm/yyyy). Batch numbers are shown zero-padded to 3 digits (e.g. `007`).

---

## 1. LOGIN / SIGNUP page

**Route suggestion:** `/login`
**Access:** public (unauthenticated users land here).

**Purpose:** authenticate admins; allow a new user to request access (created users are `admin:false` and therefore cannot log in until an admin flips the flag — today there's **no UI** to flip it, see "Known gaps").

### Layout
- Full-screen split. Left = login form on a card; Right = a decorative cover image (`login-image.png`). Logo at the top of the form.
- A custom **close-window** button top-right (desktop; drop in web).
- Draggable area at top (desktop; drop in web).

### Form (two modes: `login` ↔ `signup`, toggled by a text link)
**Login mode fields:**
1. Usuário (username) — text
2. Senha (password) — password
3. Primary button: **"Entrar"**
4. Switch link: **"Fazer cadastro"** → goes to signup mode
5. Error text area (shown on failure)

**Signup mode fields:**
1. Seu nome (full name) — text
2. Nome de usuário (username) — text
3. Senha (password) — password
4. Primary button: **"Cadastrar"**
5. Switch link: **"Fazer login"** → back to login mode

### Behavior / rules
- **Login:** POST `/session` with `{ username, password }`. Username is lowercased + trimmed server-side.
  - On success → store JWT, enter app. Token expires in **24h** (`86400s`).
  - Error codes (show as pt-BR messages): `USER_DOESNT_EXIST` → "Usuário não encontrado"; `INSUFFICIENT_PERMISSIONS` → "Usuário sem permissão"; `WRONG_PASSWORD` → "Senha incorreta". Note: non-admin users get `INSUFFICIENT_PERMISSIONS` — there's currently **no way to promote them** in-app.
- **Signup:** POST `/users` with `{ username, name, password }`. On success shows a native alert: *"Usuário criado, solicite a liberação do acesso a um administrador"* ("User created, ask an admin to grant access"), then returns to login mode. Duplicate username → `USER_ALREADY_EXISTS`.
- Buttons show a loading spinner while submitting. Validation is minimal (empty fields blocked).

---

## 2. BATCHES list page ("Lotes")

**Route suggestion:** `/batches`
**Access:** authenticated admin.

**Purpose:** overview of all batches; create a new batch; jump into a batch's details.

### Layout
- **Header row:** H1 "Lotes" + subtitle "Resumo geral de cada lote, incluindo itens de cada pedido" on the left; a **search input** "Buscar lote" on the right (searches by batch number).
- **Add button** (round `+`) floating in the top-right action area → opens the **New Batch modal**.
- **List of BatchCards** (one per batch), most recent first, paginated with a "Carregar mais" (Load more) button.

### BatchCard contents (clickable → goes to Batch Details)
| Element | Detail |
|---|---|
| **Number** (big) | batch `number`, zero-padded 3 digits (e.g. `007`) |
| **Data (Date)** | `startDate – endDate` formatted pt-BR |
| **Items** | unique list of product **descriptions** across all the batch's orders, rendered as Chips. Shows up to 19, then "+N itens". If no orders: "Ainda não há pedidos para esse lote". |
| **Chevron `>`** | visual affordance to open |

### New Batch modal (form)
- Card titled "Lote **NNN**" (shows the next auto-incremented number).
- Two date inputs: **"Data inicial"** (start) and **"Data final"** (end). (They render as text inputs that flip to date pickers on focus — a desktop quirk; use real date pickers in Next.js.)
- Primary button **"Continuar"** → POST `/batches { startDate, endDate }`. Number is assigned server-side as `count + 1`.
- Note on timezone quirk: the app sets hours to 28 to force the date to "stick" — handle date-only cleanly in the rewrite.

### Data behind it
- List: GET `/batches/summary?search=&afterCursor=` — returns `{ pageInfo, edges:[{cursor,node}], totalCount }`. Each `node` = batch **with all orders + nested product items populated** (this is a heavy payload — aggregation candidate for the rewrite).
- Create: POST `/batches { startDate, endDate }`.

---

## 3. BATCH DETAILS page

**Route suggestion:** `/batches/[id]`
**Access:** authenticated admin. Reached by clicking a BatchCard.

**Purpose:** inspect a single batch and **aggregate** its orders in three views, filter which orders are included, and download Excel reports.

### Header
- **Back button** (chevron) → returns to Batches list.
- Batch **number** (`#007`) + **date range**.
- **Segmented control** (`ButtonSwitch`) with 3 tabs: **Geral / Por produto / Por cliente** ("Overview / By product / By client"). "Geral" is default.
- **Round action buttons:** Download (only on Geral & Por cliente tabs) and Filter (toggles the order filter panel).

### Order filter panel (collapsible)
- A `ButtonSelect` listing every order in the batch as `"{client} – {deliverAt date}"`, each toggleable on/off. Only selected orders are included in the tables/totals. Orders are listed sorted by delivery date asc.

### Three aggregation views

**(a) Geral ("Overview")** — one table:
| Coluna | Meaning |
|---|---|
| ITEM | product description |
| QUANTIDADE | total amount across selected orders, **converted to the product's default unit** |
| UNIDADE | product's default unit |

Logic: for each order line, if the line's unit ≠ product default unit, divide amount by that unit's `oneDefaultEquals` conversion factor, then sum per product. Sorted alphabetically by item.

**(b) Por produto ("By product")** — grouped by product, each group:
- Header: `"{item}"`, "Total:", and the total (amount + default unit) for that product.
- Table per product:
  | COLUNA | MEANING |
  |---|---|
  | CLIENTE | client name |
  | QUANTIDADE | amount ordered by that client **in the line's original unit** (no conversion) |
  | UNIDADE | line unit |

**(c) Por cliente ("By client")** — grouped by client:
- Header: `"{client} – {deliverAt date}"`.
- Table per client:
  | COLUNA | MEANING |
  |---|---|
  | ITEM | product description |
  | QUANTIDADE | amount (original line unit) |
  | UNIDADE | line unit |
- Sorted by delivery date asc.

### Download (Excel export)
- **Geral tab** → POST `/download/general { data, batch }` → file `"Lote NNN GERAL.xlsx"`. Columns: Item, Unidade, Quantidade, Estoque (empty, 0), Faltante (formula = Quantidade − Estoque).
- **Por cliente tab** → POST `/download/orders { data, batch }` → file `"Lote NNN PEDIDOS.xlsx"`. One section per client (title = `"{client} – {deliverAt}"`), each a styled table of Item / Quantidade / Unidade.
- (Por produto has no export today.)

### Data behind it
- GET `/batches/summary/{id}` → the batch with all orders + nested items + products populated. **All three aggregations are computed client-side** today (see frontend utils `getAllSum`, `getSumByProduct`, `getSumByOrder`). In the rewrite these are strong candidates to move server-side.

---

## 4. ORDERS list page ("Pedidos")

**Route suggestion:** `/orders`
**Access:** authenticated admin.

**Purpose:** browse all orders; open/create an order.

### Layout
- **Add button** (round `+`, top-right) → opens the Order editor in "new" mode (`id = 'new'`).
- H1 "Pedidos" + subtitle "Detalhes de cada pedido".
- **List of OrderCards**, most recent first, paginated with "Carregar mais".

> Note: the Orders list currently has **no search/filter** and no batch filter (the backend *supports* filtering orders by `batch` via `?search=<batchNumber>`, but the UI doesn't expose it). Worth adding in the rewrite.

### OrderCard contents
| Element | Detail |
|---|---|
| **Client** (h3) | client name |
| "CRIADO EM" | order `createdAt` date |
| "LOTE" | batch `number`, zero-padded (e.g. `007`) |
| "ENTREGA EM" | `deliverAt` date |
| **Item chips** | unique product descriptions in this order, as Chips |
| **Edit button** (pencil) | → opens Order editor for this order |

### Data behind it
- List: GET `/orders?afterCursor=` → `{ pageInfo, edges, totalCount }`. Each node: order with `items[].item` (product) and `batch` populated.

---

## 5. ORDER editor page (new / edit)

**Route suggestion:** `/orders/new` and `/orders/[id]`
**Access:** authenticated admin.

**Purpose:** create a new order or edit an existing one. This is the most complex form in the app.

### Header / actions
- Two round buttons top-right: **Cancel** (red X) and **Confirm** (green ✓, shows loading).
- H1: **"Novo pedido"** (new) or **"Alterar pedido"** (edit).
- Cancel / Confirm both return to the Orders list.

### Top row of fields (first row)
1. **Cliente (Client)** — text input
2. **Lote (Batch)** — paginated async dropdown (`SelectPaginate`). Options loaded from `/batches`, labeled `"#007\t(dd/mm/yyyy - dd/mm/yyyy)"`. Searchable.
3. **Entrega (Delivery date)** — date input (same focus-to-date-picker trick).

### Product line editor (second row) — adds one item at a time
1. **Produto (Product)** — paginated async dropdown from `/products`, searchable by description. Each option carries the product's default unit + conversions.
2. **Quantidade (Amount)** — number input (decimals blocked at entry today; reconsider).
3. **Unidade de medida (Unit)** — simple dropdown whose options are the selected product's **default unit + its conversions**. Placeholder "Selecione um produto" until a product is picked.
4. **Add/Confirm button** (green ✓) → commits the line to the items table. When **editing** an existing line, a **red trash button** also appears to delete that line.

### Items table (bottom)
| COLUNA | MEANING |
|---|---|
| PRODUTO | product description |
| QUANTIDADE | amount |
| UNIDADE | unit |
| EDITAR | pencil → loads that line back into the editor row above for editing |

### Logic / rules worth noting
- **Merging:** adding a product+unit that already exists in the list **sums the amounts** rather than creating a duplicate.
- **Editing:** loading a line into the editor sets "editing" index. On confirm: if only the amount changed → update in place; if product/unit changed and a matching line exists → merge + sum and remove the old slot; otherwise replace.
- **Validation:** Confirm is blocked until client, batch, delivery date, and at least one item exist.
- **Save:** POST `/orders` (new) or PUT `/orders/{id}` with body:
  ```json
  {
    "client": "string",
    "batch": "<batchId>",
    "deliverAt": "ISO date (hours forced to 28)",
    "items": [{ "item": "<productId>", "amount": number, "measurementUnit": "string" }]
  }
  ```
  On create, the backend also pushes the order id into the batch's `orders` array. `createdAt` is set server-side; `archived:false`.
- **Quirk to fix:** on edit, the batch select shows the batch's date range as its label but the batch object fetched via `/orders/{id}` includes full batch info — fine to keep, just be consistent.

### Data behind it
- Load (edit): GET `/orders/{id}` (full populate).
- Save: POST `/orders` or PUT `/orders/{id}`.

---

## 6. PRODUCTS list page ("Produtos")

**Route suggestion:** `/products`
**Access:** authenticated admin.

**Purpose:** browse/search the product catalog; create/edit a product.

### Layout
- **Add button** (round `+`, top-right) → opens Product editor in "new" mode.
- Header: H1 "Produtos" + subtitle "Adicione e altere dados de produtos"; **search input** "Buscar produto" (searches by description, case-insensitive).
- **List of ProductCards**, paginated with "Carregar mais".

### ProductCard contents
| Element | Detail |
|---|---|
| **Description** (h3) | product name |
| **Units line** | `<b>defaultUnit</b> - conv1 - conv2 - …` (default unit bolded, conversions joined by " - ") |
| **Edit button** (pencil) | → opens Product editor |

### Data behind it
- List: GET `/products?search=&afterCursor=` → `{ pageInfo, edges, totalCount }`. **Archived products are excluded** server-side.

---

## 7. PRODUCT editor page (new / edit)

**Route suggestion:** `/products/new` and `/products/[id]`
**Access:** authenticated admin.

**Purpose:** create/edit a product and define its **unit conversions**.

### Header / actions
- Two round buttons: **Cancel** (red X) and **Confirm** (green ✓, loading). H1: **"Novo produto"** or **"Alterar produto"**.

### Basic fields
1. **Descrição do produto (Description)** — text
2. **Unidade de medida primária (Primary unit)** — text (e.g. "KG")

### Conversions section (only appears once a primary unit is set)
- Heading "Conversões".
- An input row expressing a ratio **`[N] <primaryUnit>  =  [M] <otherUnit>`**:
  - `defaultAmount` (number, placeholder "1") → primary side quantity
  - the primary unit label
  - `convAmount` (number, placeholder "2") → converted side quantity
  - `convUnit` (text, placeholder "UN") → target unit name
  - Behaviors: pressing Enter or blurring a field pushes the in-progress conversion into the list.
- **List of saved conversions**, each an editable row of the same 3 fields + a **trash button** to remove it.

> The stored representation is normalized to a factor: `oneDefaultEquals = convAmount / defaultAmount` (i.e. how many of the other unit equal **1** primary unit). The Orders/Batch aggregations rely on this factor.

### Logic / rules
- Validation: description and primary unit required.
- Save: POST `/products` (new) or PUT `/products/{id}` with:
  ```json
  {
    "description": "string",
    "defaultMeasurementUnit": "string",
    "conversions": [{ "measurementUnit": "string", "oneDefaultEquals": number }]
  }
  ```
- Save returns to the Products list.

### Data behind it
- Load (edit): GET `/products/{id}`.
- Save: POST `/products` or PUT `/products/{id}`.
- Delete (archive): DELETE `/products/{id}` → sets `archived:true` (soft delete; exists in API but **not exposed in the current UI** — a gap to consider).

---

## 8. Data model summary (backend / MongoDB)

Four collections. All "deletes" are soft (`archived:true`). Note the mismatches flagged.

### `User`
| field | type | notes |
|---|---|---|
| `username` | string, **unique** | lowercased + trimmed |
| `name` | string | |
| `password` | string | bcrypt hash (10 rounds) |
| `admin` | boolean, default false | **only admins can log in** |

### `Product`
| field | type | notes |
|---|---|---|
| `description` | string | free text |
| `defaultMeasurementUnit` | string | |
| `conversions` | `[{ measurementUnit, oneDefaultEquals }]` | see Product editor |
| `archived` | boolean | soft delete |

> ⚠️ Schema mismatch: the interface declares `name`, but the schema field is `description`. `description:"Product"` is also incorrectly used as a literal field. Normalize in the rewrite.

### `Batch`
| field | type | notes |
|---|---|---|
| `number` | number | auto `count+1` on create (race-condition prone — use a sequence/counter in the rewrite) |
| `startDate` | date | |
| `endDate` | date | |
| `orders` | `ObjectId[] → Order` | denormalized back-reference (also stored on Order.batch) |

### `Order`
| field | type | notes |
|---|---|---|
| `client` | string | |
| `batch` | `ObjectId → Batch` | |
| `createdAt` | date | set server-side |
| `deliverAt` | date | |
| `items[]` | `{ item: ObjectId→Product, amount: number, measurementUnit: string }` | embedded subdocuments (no own collection) |
| `archived` | boolean | soft delete |

### Relationships
- Batch ⇄ Order: stored **both ways** (Batch.orders[] and Order.batch). The create-order handler maintains both; the update handler does **not** sync them (bug to fix).
- Order → Product: referenced per line via `items[].item`.

---

## 9. Full API surface (Express + JWT)

All routes except `/session` and `/users` (create) require `Authorization: Bearer <jwt>`. **Auth middleware currently rejects all non-admin tokens with 403** (so only admins can call them). Pagination is cursor-based (`afterCursor`, base64 of the `_id`); page sizes: products 29, orders 30, batches 30.

| Method | Path | Purpose | Body / Query |
|---|---|---|---|
| POST | `/session` | login | `{ username, password }` → `{ token }` |
| POST | `/users` | create user | `{ username, name, password }` → `{ id }` |
| GET | `/products` | list (paginated, search) | `?search=&afterCursor=` |
| POST | `/products` | create | product body |
| GET | `/products/:id` | get one | |
| PUT | `/products/:id` | update | product body |
| DELETE | `/products/:id` | archive (soft) | |
| GET | `/orders` | list (paginated; optional batch filter) | `?search=<batchNo>&afterCursor=` |
| POST | `/orders` | create | order body (also pushes to Batch.orders) |
| GET | `/orders/:id` | get one (populated) | |
| PUT | `/orders/:id` | update | order body |
| DELETE | `/orders/:id` | archive (soft) | |
| GET | `/batches` | list (light: number+dates) | `?search=&afterCursor=` |
| POST | `/batches` | create | `{ startDate, endDate }` |
| GET | `/batches/summary` | list with full orders+items populated | `?search=&afterCursor=` |
| GET | `/batches/summary/:id` | one batch fully populated | |
| POST | `/download/general` | Excel: per-product totals | `{ data:[{item,amount,unit}], batch }` → `.xlsx` |
| POST | `/download/orders` | Excel: per-client sections | `{ data:[{client,deliverAt,items[]}], batch }` → `.xlsx` |

---

## 10. Known gaps, bugs & rewrite opportunities

Functional things the current app is missing or does poorly — good to address during the rewrite:

1. **No admin user-management UI.** New users register as non-admin and can never log in (no screen to list/promote/delete users, no way to toggle `admin` or `archived`).
2. **Order list has no search/filter** even though the backend supports `?search=<batch>`. Add filtering by batch / client / date.
3. **No delete UI for products or orders** (DELETE endpoints exist but aren't wired to any button).
4. **Batch↔Order denormalization can drift.** Updating an order's `batch` does not move it between batches' `orders[]` arrays. Prefer computing batch membership from `Order.batch` rather than maintaining `Batch.orders[]`.
5. **Batch numbering via `count+1`** is racy; use an atomic counter/sequence.
6. **Heavy `/batches/summary` payloads** (full nested populate) and **client-side aggregation** — move aggregations into DB queries / API for performance.
7. **Date handling hacks** (forcing hours to 28) — model dates as date-only where appropriate.
8. **No `createdBy`/audit info** on orders/products; no soft-delete visibility or restore.
9. **Pagination is custom cursor logic** with two different sort directions (products `_id` asc vs orders/batches `_id` desc) — easy to get wrong; replace with standard offset or Relay cursor.
10. **Auth model is "admin-only".** CASL is imported but barely used. Decide if you want roles (e.g. viewer vs editor) in the rewrite.

---

## 11. Suggested Next.js route map (App Router)

```
/login                          (public)
/                               → redirect to /batches
/batches                        list
/batches/new                    create (modal could stay inline)
/batches/[id]                   details + 3 aggregation tabs + export
/orders                         list (+ add filters)
/orders/new                     create
/orders/[id]                    edit
/products                       list
/products/new                   create
/products/[id]                  edit
/admin/users                    (NEW) manage users / promote admin
```
