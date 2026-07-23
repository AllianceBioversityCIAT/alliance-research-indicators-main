export interface PatchIpOwner {
  publicity_restriction?: boolean | number;
  requires_futher_development?: boolean | number;
  asset_ip_owner?: number;
  asset_ip_owner_description?: string | null;
  potential_asset_description?: string | null;
  requires_futher_development_description?: string | null;
  publicity_restriction_description?: string | null;
  potential_asset?: boolean | number;
  private_sector_engagement_id?: number;
  formal_ip_rights_application_id?: number;
}
