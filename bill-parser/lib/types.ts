export interface LineItem {
  description: string;
  cpt_code: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  date: string | null;
}

export interface InsuranceInfo {
  insurance_paid: number | null;
  patient_responsibility: number | null;
  deductible_applied: number | null;
  copay: number | null;
}

export interface BillData {
  patient_name: string | null;
  date_of_service: string | null;
  provider_name: string | null;
  provider_address: string | null;
  total_charges: number | null;
  line_items: LineItem[];
  insurance_info: InsuranceInfo;
}
