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

import { useMemo, useState, type JSX } from "react";
import {
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@wso2/oxygen-ui";
import { SearchIcon, TagsIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import EmptyState from "@features/sales/cado2/components/empty-state/EmptyState";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { useDebouncedValue } from "@hooks/useDebouncedValue";
import { changedText } from "@features/sales/cado2/quotes/form/draftForm";
import type { LineCategory } from "@features/sales/cado2/quotes/api/quoteTypes";
import {
  MIN_PRODUCT_SEARCH,
  useProductCategories,
  useProductCategorySearch,
  useSetProductCategory,
} from "@features/sales/cado2/admin/product-categories/api/useProductCategories";
import type { ProductCategoryMapping } from "@features/sales/cado2/admin/product-categories/api/productCategoryTypes";

const CATEGORIES: readonly { value: LineCategory; label: string }[] = [
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "SUPPORT", label: "Support" },
  { value: "PROFESSIONAL_SERVICE", label: "Professional Service" },
];

/** The select's value for "not mapped". */
const NONE = "";

/**
 * One product's category: choosing one maps the product; "Not mapped"
 * removes the mapping. Saved as soon as it changes.
 */
function CategorySelect({
  product,
  value,
  saving,
  disabled,
  onChange,
}: {
  product: string;
  value: LineCategory | null;
  saving: boolean;
  disabled: boolean;
  onChange: (c: LineCategory | null) => void;
}): JSX.Element {
  return (
    <TextField
      select
      size="small"
      value={value ?? NONE}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === NONE ? null : (e.target.value as LineCategory))}
      sx={{ minWidth: 220 }}
      slotProps={{
        // Shows "Not mapped" rather than an empty box.
        select: { displayEmpty: true },
        htmlInput: { "aria-label": `Category of ${product}` },
        input: saving
          ? {
              endAdornment: (
                <InputAdornment position="end" sx={{ mr: 3 }}>
                  <CircularProgress size={14} aria-label="Saving" />
                </InputAdornment>
              ),
            }
          : undefined,
      }}
    >
      <MenuItem value={NONE}>
        <Typography variant="body2" color="text.secondary">
          Not mapped
        </Typography>
      </MenuItem>
      {CATEGORIES.map((c) => (
        <MenuItem key={c.value} value={c.value}>
          {c.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function ProductCell({ name, details }: { name: string; details: readonly (string | null)[] }): JSX.Element {
  const line = details.filter(Boolean).join(" · ");
  return (
    <>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {name}
      </Typography>
      {line ? (
        <Typography variant="caption" color="text.secondary" display="block">
          {line}
        </Typography>
      ) : null}
    </>
  );
}

/**
 * CadO2 Admin → Product Categories: map a Salesforce product to its
 * line category once, so reps don't choose it. A line of a mapped product
 * takes that category and the rep can't change it; for an unmapped product
 * the rep chooses, and Deal Desk sees that it was the rep's choice.
 */
export default function ProductCategoriesPage(): JSX.Element {
  const mapped = useProductCategories();
  const set = useSetProductCategory();
  const notify = useCado2Toast();
  const [term, setTerm] = useState("");
  const search = useProductCategorySearch(useDebouncedValue(term, 300));
  const [filter, setFilter] = useState("");
  const [only, setOnly] = useState<LineCategory | "ALL">("ALL");

  const savingId = set.isPending ? set.variables?.productId : undefined;
  // Removing a mapping asks first; choosing or changing one is instant (2026-10-13).
  const [unmapping, setUnmapping] = useState<{ productId: string; name: string } | null>(null);
  const change = (productId: string, name: string, category: LineCategory | null) => {
    if (category === null) {
      set.reset();
      setUnmapping({ productId, name });
      return;
    }
    set.mutate({ productId, category }, { onSuccess: () => notify("Category saved") });
  };

  const shown = useMemo(() => filterMapped(mapped.data ?? [], filter, only), [mapped.data, filter, only]);
  const searching = term.trim().length >= MIN_PRODUCT_SEARCH;

  return (
    <Stack spacing={3} sx={{ maxWidth: 1100 }}>
      <PageHeader title="Product Categories" />

      {set.error && !unmapping ? (
        <ErrorNotice error={set.error} onRetry={() => set.variables && set.mutate(set.variables)} retrying={set.isPending}>
          Couldn&apos;t change the category.
        </ErrorNotice>
      ) : null}

      <SectionCard title="Map a Product" icon={<SearchIcon size={16} />}>
        <Stack spacing={2}>
          <TextField
            size="small"
            placeholder="Search Salesforce products by name or product code"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            sx={{ maxWidth: 480 }}
            slotProps={{
              htmlInput: { "aria-label": "Search Salesforce products" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={16} />
                  </InputAdornment>
                ),
              },
            }}
          />
          {!searching ? (
            <Typography variant="body2" color="text.secondary">
              Find a product, then choose its category. It applies to every new or edited line of that product.
            </Typography>
          ) : search.error ? (
            <ErrorNotice error={search.error} onRetry={() => void search.refetch()} retrying={search.isFetching}>
              Couldn&apos;t search the products.
            </ErrorNotice>
          ) : search.isPending ? (
            <Skeleton variant="rounded" height={120} aria-label="Searching products" />
          ) : search.data.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No active products with a price match &ldquo;{term.trim()}&rdquo;.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
              <Table size="small" aria-label="Search results">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {search.data.map((p) => {
                    const name = p.productName ?? p.productId;
                    return (
                      <TableRow key={p.productId} hover>
                        <TableCell>
                          <ProductCell name={name} details={[p.productCode, p.family]} />
                        </TableCell>
                        <TableCell sx={{ width: 260 }}>
                          <CategorySelect
                            product={name}
                            value={p.category}
                            saving={savingId === p.productId}
                            disabled={set.isPending}
                            onChange={(c) => change(p.productId, name, c)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </SectionCard>

      <SectionCard
        title={mapped.data ? `Mapped products (${mapped.data.length})` : "Mapped products"}
        icon={<TagsIcon size={16} />}
      >
        {mapped.error ? (
          <ErrorNotice error={mapped.error} onRetry={() => void mapped.refetch()} retrying={mapped.isFetching}>
            Couldn&apos;t load the mapped products.
          </ErrorNotice>
        ) : mapped.isPending ? (
          <Skeleton variant="rounded" height={160} aria-label="Loading mapped products" />
        ) : mapped.data.length === 0 ? (
          <EmptyState
            icon={<TagsIcon size={28} />}
            title="No products mapped yet"
            body="Until a product is mapped, AMs choose its category on each line and Deal Desk checks it. Start with the products sold most often."
          />
        ) : (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              <TextField
                size="small"
                placeholder="Filter by name or code"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                sx={{ flexGrow: 1, maxWidth: { sm: 360 } }}
                slotProps={{ htmlInput: { "aria-label": "Filter mapped products" } }}
              />
              <ToggleButtonGroup
                size="small"
                exclusive
                value={only}
                onChange={(_, v: typeof only | null) => v && setOnly(v)}
                aria-label="Filter by category"
              >
                <ToggleButton value="ALL">All</ToggleButton>
                {CATEGORIES.map((c) => (
                  <ToggleButton key={c.value} value={c.value}>
                    {c.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            {shown.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No mapped products match.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                <Table size="small" aria-label="Mapped products">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Last changed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shown.map((m) => {
                      const name = m.productName ?? m.productId;
                      return (
                        <TableRow key={m.productId} hover>
                          <TableCell>
                            <ProductCell name={name} details={[m.productCode]} />
                          </TableCell>
                          <TableCell sx={{ width: 260 }}>
                            <CategorySelect
                              product={name}
                              value={m.category}
                              saving={savingId === m.productId}
                              disabled={set.isPending}
                              onChange={(c) => change(m.productId, name, c)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {changedText(m.updatedAt, m.updatedByEmail)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        )}
      </SectionCard>

      {unmapping ? (
        <LifecycleDialog
          title={`Remove the category of ${unmapping.name}?`}
          confirmLabel="Remove category"
          danger
          pending={set.isPending}
          error={set.error}
          onClose={() => setUnmapping(null)}
          onConfirm={() =>
            set.mutate(
              { productId: unmapping.productId, category: null },
              {
                onSuccess: () => {
                  notify("Category removed");
                  setUnmapping(null);
                },
              },
            )
          }
        >
          AMs will choose its category themselves when they add it, and Deal Desk sees that choice. A draft takes this at its
          next save; submitted quotes keep their categories.
        </LifecycleDialog>
      ) : null}
    </Stack>
  );
}

/** Case-insensitive match on name or code, then the category filter. */
function filterMapped(
  all: readonly ProductCategoryMapping[],
  term: string,
  only: LineCategory | "ALL",
): ProductCategoryMapping[] {
  const t = term.trim().toLowerCase();
  return all.filter(
    (m) =>
      (only === "ALL" || m.category === only) &&
      (!t || [m.productName, m.productCode].some((f) => f?.toLowerCase().includes(t))),
  );
}
