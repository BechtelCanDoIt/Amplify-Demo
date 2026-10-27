// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import { useState, type JSX, type ReactNode } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { PackageIcon, PercentIcon } from "@wso2/oxygen-ui-icons-react";
import { formatMoney } from "@features/sales/cado2/utils/money";
import { useDebouncedValue } from "@hooks/useDebouncedValue";
import { descriptionAfterName } from "@features/sales/cado2/utils/productDescription";
import { lineProblems } from "@features/sales/cado2/quotes/components/lineProblems";
import { usePricingFormulas, useProducts } from "@features/sales/cado2/quotes/api/useQuoteApi";
import type {
  CategorySource,
  LineCategory,
  LineFormula,
  PricebookRef,
  PricingFormula,
  Product,
} from "@features/sales/cado2/quotes/api/quoteTypes";
import { bindingsSummary, versionLabel } from "@features/sales/cado2/utils/pricingFormula";
import {
  ProductListContext,
  productLabel,
  useProductList,
} from "@features/sales/cado2/components/product-list/productList";
import { ProductListPaper, ProductOption } from "@features/sales/cado2/components/product-list/ProductListParts";
import { formatDate, LINE_CATEGORIES, type LineValue } from "@features/sales/cado2/quotes/form/draftForm";

/** A small heading for a group of fields in the dialog. */
function Group({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }): JSX.Element {
  return (
    <Box component="section" aria-label={title}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary", mb: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1,
            display: "grid",
            placeItems: "center",
            color: "primary.main",
            bgcolor: "action.selected",
          }}
        >
          {icon}
        </Box>
        <Typography variant="overline" sx={{ lineHeight: 1.2, fontWeight: 600 }}>
          {title}
        </Typography>
      </Stack>
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}

/**
 * How the card prices the line: the price book; a saved line's formula
 * version, with the price it worked out (D82); or the formula in force, for a
 * new or moved line, worked out on the quote (D81).
 */
type CardPricing =
  | { kind: "PRICE_BOOK" }
  | { kind: "KEPT_FORMULA"; formula: LineFormula }
  | { kind: "FORMULA"; formula: PricingFormula };

/**
 * The chosen product and its price, shown prominently (the price can't be
 * edited), with where the price comes from.
 */
function ProductCard(props: {
  name: string;
  /** The Salesforce description; shown without the name if it repeats it. */
  description: string | null;
  code: string;
  pricebook: string;
  unitPrice: string;
  currency: string;
  pricing: CardPricing;
  note?: string;
}): JSX.Element {
  const p = props.pricing;
  return (
    <Paper
      variant="outlined"
      aria-label="Chosen product"
      sx={{ p: 2, borderRadius: 2, borderLeft: 4, borderLeftColor: "primary.main" }}
    >
      <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {props.name}
          </Typography>
          {descriptionAfterName(props.name, props.description) ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {descriptionAfterName(props.name, props.description)}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 0.5 }}>
            {props.code ? (
              <Chip size="small" variant="outlined" label={props.code} sx={{ fontFamily: "monospace" }} />
            ) : null}
            {props.pricebook ? <Chip size="small" variant="outlined" label={props.pricebook} /> : null}
          </Stack>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          {p.kind === "FORMULA" ? (
            <>
              <Typography variant="h6" component="p" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                By formula
              </Typography>
              <Typography variant="caption" color="text.secondary">
                worked out on the quote
              </Typography>
            </>
          ) : (
            <>
              <Typography
                variant="h6"
                component="p"
                sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
              >
                {props.currency} {props.unitPrice ? formatMoney(props.unitPrice) : "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {p.kind === "KEPT_FORMULA" ? "per unit, by formula" : "per unit, from the price book"}
              </Typography>
            </>
          )}
        </Box>
      </Stack>
      {p.kind !== "PRICE_BOOK" ? (
        <Box aria-label="Pricing formula" sx={{ mt: 1.5, p: 1.25, borderRadius: 1, bgcolor: "action.hover" }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Formula{" "}
            {p.kind === "KEPT_FORMULA"
              ? versionLabel(p.formula.version, p.formula.versionDate)
              : versionLabel(p.formula.version, p.formula.updatedAt)}
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
            {p.formula.expression}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {p.kind === "KEPT_FORMULA" ? `= ${p.formula.explanation}` : bindingsSummary(p.formula.bindings)}
          </Typography>
        </Box>
      ) : null}
      {props.note ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          {props.note}
        </Typography>
      ) : null}
    </Paper>
  );
}

interface AddLineDialogProps {
  readonly open: boolean;
  /** The line being edited, or null to add one. */
  readonly line: LineValue | null;
  readonly currency: string;
  /** The quote's price book, which is the opportunity's: every product and price comes from it. */
  readonly pricebook: PricebookRef;
  readonly onSave: (line: LineValue) => void;
  readonly onClose: () => void;
}

const CATEGORIES = LINE_CATEGORIES;

const categoryLabel = (c: LineCategory) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

/** The product as the list shows it; the code is shown because names repeat. */
const getName = (p: Product) => productLabel(p.name ?? p.id, p.productCode);

/**
 * Add or edit a line. Products and prices come
 * from the price book in the quote's currency; the unit price can't be
 * edited. The product code is shown because names repeat.
 */
export default function AddLineDialog({
  open,
  line,
  currency,
  pricebook,
  onSave,
  onClose,
}: AddLineDialogProps): JSX.Element {
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 300);
  // The quote's price book only, a page at a time as the rep scrolls.
  // Editing never searches: a line's product can't be changed, only removed (2026-10-12).
  const products = useProducts(open && !line ? currency : "", debounced, pricebook.id);
  const options = products.data ?? [];
  const { state: listState, listboxProps } = useProductList(products, options.length);

  const [product, setProduct] = useState<Product | null>(null);
  // The parent mounts the dialog afresh for each add/edit, so the line (or
  // blanks) only needs loading once.
  // The rep's choice, used only for a product without a mapping.
  const [category, setCategory] = useState<LineCategory | "">(line?.category ?? "");
  // Locked for now (2026-10-14): a saved line keeps its value; a new one has none.
  const [quantity, setQuantity] = useState(line?.quantity ?? "1");
  const [discount, setDiscount] = useState(line?.discount ?? "0");
  const [tried, setTried] = useState(false);
  const formulas = usePricingFormulas();

  // A product carries one price: the quote's book's.
  const entry = product?.pricebookEntries[0];
  // Editing without re-choosing the product keeps the saved snapshot.
  const keepsExisting = line !== null && product === null;
  // A mapped product's category is the Admin's and can't be changed.
  const mapped: LineCategory | null = product
    ? (product.category ?? null)
    : keepsExisting && line.categorySource === "MAPPED" && line.category
      ? line.category
      : null;
  const source: CategorySource = mapped ? "MAPPED" : "REP";
  const chosen = product !== null || keepsExisting;
  // How the line is priced (D81, D82). A saved line keeps its pricing until
  // the AM moves it to the product's pricing in force; a new line takes that.
  const [moved, setMoved] = useState(line?.useLatestPricing ?? false);
  const kept = keepsExisting && !moved ? line.keepPricing : undefined;
  const productId = product ? product.id : keepsExisting ? line.productId : undefined;
  const latest = productId ? formulas.data?.find((f) => f.productId === productId) : undefined;
  const inForce = latest?.status === "ACTIVE" ? latest : undefined;
  const pricing: CardPricing = kept
    ? kept.method === "FORMULA" && kept.formula
      ? { kind: "KEPT_FORMULA", formula: kept.formula }
      : { kind: "PRICE_BOOK" }
    : inForce
      ? { kind: "FORMULA", formula: inForce }
      : { kind: "PRICE_BOOK" };
  // A formula line has no discount.
  const formula = kept ? kept.method === "FORMULA" : Boolean(inForce);
  // What the AM can move the kept line to, if the pricing in force differs.
  const moveTo = !kept
    ? null
    : kept.method === "FORMULA"
      ? latest && latest.versionId !== kept.formulaVersionId
        ? latest.status === "ACTIVE"
          ? {
              text: `A newer version of this formula is in force: ${versionLabel(latest.version, latest.updatedAt)}.`,
              action: `Use v${latest.version}`,
            }
          : {
              text: `This formula was removed on ${formatDate(latest.updatedAt.slice(0, 10))}. New lines are priced from the price book.`,
              action: "Use the price-book price",
            }
        : null
      : inForce
        ? { text: `This product now has a pricing formula: ${versionLabel(inForce.version, inForce.updatedAt)}.`, action: "Use the formula" }
        : null;
  // The unit of measure: a formula line's comes from its version (D83);
  // otherwise it is locked until it comes from Salesforce (D79), and a line
  // moved off a formula has none.
  const uom =
    pricing.kind === "FORMULA"
      ? pricing.formula.unitOfMeasure
      : pricing.kind === "KEPT_FORMULA"
        ? (pricing.formula.unitOfMeasure ?? line?.unitOfMeasure ?? "")
        : keepsExisting && moved && line.keepPricing?.method === "FORMULA"
          ? ""
          : (line?.unitOfMeasure ?? "");
  const uomSource =
    pricing.kind === "PRICE_BOOK" ? "Will come from Salesforce" : `From the pricing formula v${pricing.formula.version}`;
  // A line moved off a formula goes back to the price-book price it was worked out from.
  const keptUnitPrice =
    keepsExisting && moved && line.keepPricing?.method === "FORMULA" ? (line.keepPricing.formula?.listPrice ?? line.unitPrice) : line?.unitPrice ?? "";

  const problems = lineProblems({
    pricebookEntryId: keepsExisting ? line.pricebookEntryId : entry ? entry.id : "",
    category: mapped ?? category,
    quantity,
    discount: formula ? "0" : discount,
  });
  const show = (k: string) => (tried ? problems[k] : undefined);

  const chooseProduct = (p: Product | null) => {
    setProduct(p);
    // No pre-fill: Product_Unit__c turned out to be the product family (APIM,
    // IAM…), not a unit of measure (verified 2026-09-26). The rep types it.
  };

  const save = () => {
    setTried(true);
    if (Object.keys(problems).length > 0) return;
    const base: LineValue = keepsExisting
      ? { ...line }
      : {
          lineId: null,
          pricebookEntryId: entry!.id,
          productId: product!.id,
          productName: product!.name ?? product!.id,
          productCode: product!.productCode ?? "",
          productDescription: product!.description ?? "",
          pricebookId: entry!.pricebook?.id ?? "",
          pricebookName: entry!.pricebook?.name ?? "",
          unitPrice: entry!.unitPrice ?? "",
          category: mapped ?? (category as LineCategory),
          categorySource: source,
          recurring: product!.recurring,
          unitOfMeasure: "",
          quantity: "",
          discount: "",
        };
    onSave({
      ...base,
      category: mapped ?? (category as LineCategory),
      categorySource: source,
      unitOfMeasure: uom.trim(),
      quantity: String(Number(quantity)),
      discount: formula ? "0" : discount.trim() || "0",
      unitPrice: keepsExisting ? keptUnitPrice : base.unitPrice,
      useLatestPricing: keepsExisting && moved ? true : undefined,
    });
  };

  return (
    // A click outside doesn't throw the typed line away (2026-10-13); Cancel, X or Escape close it.
    <Dialog open={open} onClose={(_, reason) => reason !== "backdropClick" && onClose()} fullWidth maxWidth="sm">
      <DialogTitle component="div">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            aria-hidden
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              display: "grid",
              placeItems: "center",
              color: "primary.main",
              bgcolor: "action.selected",
            }}
          >
            <PackageIcon size={20} />
          </Box>
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {line ? "Edit line" : "Add line"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Priced from {pricebook.name} in {currency}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Group icon={<PackageIcon size={14} />} title="Product">
            {line && keepsExisting ? (
              <ProductCard
                name={line.productName}
                description={line.productDescription}
                code={line.productCode}
                pricebook={line.pricebookName}
                unitPrice={keptUnitPrice}
                currency={currency}
                pricing={pricing}
                note="The product can't be changed. To use a different one, remove this line and add it."
              />
            ) : product && entry ? (
              <ProductCard
                name={product.name ?? product.id}
                description={product.description ?? null}
                code={product.productCode ?? ""}
                pricebook={entry.pricebook?.name ?? ""}
                unitPrice={entry.unitPrice ?? ""}
                currency={currency}
                pricing={pricing}
              />
            ) : null}
            {moveTo ? (
              <Alert
                severity="info"
                action={
                  <Button color="inherit" size="small" onClick={() => setMoved(true)}>
                    {moveTo.action}
                  </Button>
                }
              >
                {moveTo.text} This line keeps the pricing it was saved with until you change it.
              </Alert>
            ) : null}
            {line ? null : (
              <ProductListContext.Provider value={listState}>
                <Autocomplete
                  options={options}
                  getOptionLabel={getName}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  filterOptions={(x) => x}
                  loading={products.isPending && products.fetchStatus !== "idle"}
                  value={product}
                  onChange={(_, p) => chooseProduct(p)}
                  onInputChange={(_, v) => setTerm(v)}
                  slots={{ paper: ProductListPaper }}
                  slotProps={{ listbox: listboxProps }}
                  renderOption={({ key, ...props }, p) => (
                    <ProductOption key={key} liProps={props} name={p.name ?? p.id} code={p.productCode} description={p.description} />
                  )}
                  noOptionsText={
                    products.error
                      ? "Couldn't load the products. Try again." // not "no matching" (2026-10-13)
                      : `No matching products in ${pricebook.name}`
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Product"
                      placeholder="Search by name or product code"
                      size="small"
                      required
                      error={Boolean(show("product")) && !product}
                      helperText={show("product") && !product ? show("product") : `Products in ${pricebook.name}, priced in ${currency}`}
                    />
                  )}
                />
              </ProductListContext.Provider>
            )}
            {chosen && mapped ? (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                aria-label="Category"
                sx={{ flexWrap: "wrap", rowGap: 0.5 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Category
                </Typography>
                <Chip size="small" color="primary" variant="outlined" label={categoryLabel(mapped)} />
                <Typography variant="caption" color="text.secondary">
                  Set for this product by an Admin
                </Typography>
              </Stack>
            ) : chosen ? (
              <>
                <Alert severity="warning">
                  No category is set up for this product. Choose one; Deal Desk will check it.
                </Alert>
                <TextField
                  select
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LineCategory)}
                  size="small"
                  required
                  error={Boolean(show("category"))}
                  helperText={show("category")}
                >
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            ) : null}
          </Group>
          <Group icon={<PercentIcon size={14} />} title="Quantity & Discount">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                size="small"
                required
                inputMode="numeric"
                error={Boolean(show("quantity"))}
                helperText={show("quantity") ?? "Whole units only"}
              />
              <TextField
                label="Discount"
                value={formula ? "0" : discount}
                onChange={(e) => setDiscount(e.target.value)}
                size="small"
                disabled={Boolean(formula)}
                error={Boolean(show("discount")) && !formula}
                helperText={formula ? "No discount on formula-priced products" : show("discount")}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  },
                }}
              />
            </Stack>
            {/* Its own row: the description under it can be up to ~140 characters. */}
            {/* Locked (2026-10-14): from the pricing formula (D83), else it will come from Salesforce. */}
            <TextField
              label="Unit of measure"
              value={uom}
              size="small"
              fullWidth
              disabled
              helperText={uomSource}
            />
          </Group>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save}>
          {line ? "Save line" : "Add line"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
