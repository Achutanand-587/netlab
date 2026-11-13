import { post } from './api';

export interface BinaryRepresentation {
  address: string;
  mask: string;
  network: string;
}

export interface SubnetResult {
  ip: string;
  prefix: number;
  cidr: string;
  network: string;
  subnet_mask: string;
  wildcard_mask: string;
  broadcast: string;
  has_broadcast: boolean;
  first_host: string;
  last_host: string;
  total_addresses: number;
  usable_hosts: number;
  is_private: boolean;
  network_class: string;
  ip_type: string;
  binary: BinaryRepresentation;
}

export interface SubnetRow {
  cidr: string;
  network: string;
  first_host: string;
  last_host: string;
  broadcast: string;
  usable_hosts: number;
}

export interface SplitResult {
  parent_cidr: string;
  new_prefix: number;
  subnet_count: number;
  returned: number;
  truncated: boolean;
  subnets: SubnetRow[];
}

export interface VlsmRequirement {
  name: string;
  needed_hosts: number;
}

export interface VlsmAllocatedSubnet {
  name: string;
  needed_hosts: number;
  allocated_hosts: number;
  prefix: number;
  cidr: string;
  network: string;
  first_host: string;
  last_host: string;
  broadcast: string;
  subnet_mask: string;
}

export interface VlsmResult {
  parent_cidr: string;
  total_parent_addresses: number;
  allocated: VlsmAllocatedSubnet[];
  unallocated: string[];
  remaining_addresses: number;
}

export const subnettingService = {
  calculate: async (ip: string, prefix: number): Promise<SubnetResult> => {
    return post<SubnetResult>('/subnetting/calculate', { ip, prefix });
  },

  split: async (
    ip: string,
    prefix: number,
    newPrefix: number,
    limit: number = 256
  ): Promise<SplitResult> => {
    return post<SplitResult>('/subnetting/split', {
      ip,
      prefix,
      new_prefix: newPrefix,
      limit,
    });
  },

  vlsm: async (
    parentCidr: string,
    requirements: VlsmRequirement[]
  ): Promise<VlsmResult> => {
    return post<VlsmResult>('/subnetting/vlsm', {
      parent_cidr: parentCidr,
      requirements,
    });
  },
};
