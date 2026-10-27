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

/** A WSO2 legal entity, as GET /legal-entities returns it. */
export interface LegalEntity {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly addressLine1: string;
  readonly addressLine2: string | null;
  readonly city: string;
  readonly stateProvince: string | null;
  readonly postalCode: string | null;
  readonly country: string;
  readonly phone: string | null;
  readonly taxId: string | null;
  readonly registrationNumber: string | null;
  readonly isActive: boolean;
  readonly updatedByEmail: string;
  readonly updatedAt: string;
}

/**
 * The editable fields, as the form holds them. Optional fields are "" when
 * empty: the backend stores "" as empty and, on update, "" clears the field.
 */
export interface LegalEntityFormValues {
  code: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  phone: string;
  taxId: string;
  registrationNumber: string;
  isActive: boolean;
}

/** Form values for a new entity. */
export const emptyLegalEntityForm: LegalEntityFormValues = {
  code: "",
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  country: "",
  phone: "",
  taxId: "",
  registrationNumber: "",
  isActive: true,
};

/** Form values for editing an existing entity. */
export function toFormValues(e: LegalEntity): LegalEntityFormValues {
  return {
    code: e.code,
    name: e.name,
    addressLine1: e.addressLine1,
    addressLine2: e.addressLine2 ?? "",
    city: e.city,
    stateProvince: e.stateProvince ?? "",
    postalCode: e.postalCode ?? "",
    country: e.country,
    phone: e.phone ?? "",
    taxId: e.taxId ?? "",
    registrationNumber: e.registrationNumber ?? "",
    isActive: e.isActive,
  };
}
