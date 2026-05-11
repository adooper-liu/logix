export type ProductLine =
  | 'PARCEL_EXPRESS'
  | 'LINEHAUL_INTL'
  | 'MID_LARGE_PIECE'
  | 'TRUCKING_CARD';

export type CalcMode = 'FIRST_ADDITIONAL' | 'TIER_FLAT' | 'PER_KG_LINEAR' | 'MIN_PLUS_PER_KG';

export interface QuoteRequest {
  countryCode: string;
  carrierCode?: string;
  serviceCode?: string;
  productLine?: ProductLine;
  versionKey?: string;
  shipDate?: string;
  destinationPostal?: string;
  originCode?: string;
  destinationCode?: string;
  grossWeightKg?: number;
}

export interface BaseFreightContext {
  calcMode: CalcMode;
  billableWeightKg: number;
  weightFrom?: number | null;
  weightTo?: number | null;
  firstWeight?: number | null;
  firstFee?: number | null;
  additionalStepWeight?: number | null;
  additionalFeePerStep?: number | null;
  flatFee?: number | null;
  minCharge?: number | null;
  maxCharge?: number | null;
}

export interface BaseFreightResult {
  amount: number;
  steps?: number;
}

