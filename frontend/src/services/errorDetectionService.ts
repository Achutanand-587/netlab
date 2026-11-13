import { post } from './api';

export interface Step {
  step: number;
  description: string;
  value?: string | null;
}

export interface Verification {
  passed: boolean;
  error_detected: boolean;
  detail: string;
  errors_injected: boolean;
  undetected_error: boolean;
}

export interface EncodeResult {
  algorithm: string;
  parity_type?: string | null;
  generator?: string | null;
  data_bits: string;
  padded_data_bits: string;
  redundant_bits: string;
  transmitted_bits: string;
  flipped_positions: number[];
  received_bits: string;
  steps: Step[];
  steps_truncated: boolean;
  verification: Verification;
}

export interface VerifyResult {
  algorithm: string;
  received_bits: string;
  steps: Step[];
  steps_truncated: boolean;
  verification: Verification;
}

export interface TwoDParityResult {
  row_width: number;
  num_rows: number;
  parity_type: string;
  original_matrix: string[][];
  row_parities: string[];
  col_parities: string[];
  transmitted_bits: string;
  flipped_positions: number[];
  received_matrix: string[][];
  received_row_parities: string[];
  received_col_parities: string[];
  row_error_indices: number[];
  col_error_indices: number[];
  passed: boolean;
  error_detected: boolean;
  can_correct_single_bit: boolean;
  corrected_position?: [number, number] | null;
  detail: string;
}

export interface ExperimentStats {
  algorithm: string;
  trials: number;
  detected: number;
  undetected: number;
  detection_rate_pct: number;
  missed_rate_pct: number;
}

export interface ErrorExperimentResult {
  trials: number;
  flip_count: number;
  data_length: number;
  stats: ExperimentStats[];
  explanation: string;
}

export const errorDetectionService = {
  encode: async (
    data: string,
    algorithm: string,
    parityType: 'even' | 'odd' = 'even',
    generator: string = '1011',
    flipPositions: number[] = []
  ): Promise<EncodeResult> => {
    return post<EncodeResult>('/error-detection/encode', {
      data,
      algorithm,
      parity_type: parityType,
      generator,
      flip_positions: flipPositions,
    });
  },

  verify: async (
    receivedBits: string,
    algorithm: string,
    parityType: 'even' | 'odd' = 'even',
    generator: string = '1011'
  ): Promise<VerifyResult> => {
    return post<VerifyResult>('/error-detection/verify', {
      received_bits: receivedBits,
      algorithm,
      parity_type: parityType,
      generator,
    });
  },

  twoDParity: async (
    data: string,
    rowWidth: number = 8,
    parityType: 'even' | 'odd' = 'even',
    flipPositions: number[] = []
  ): Promise<TwoDParityResult> => {
    return post<TwoDParityResult>('/error-detection/2d-parity', {
      data,
      row_width: rowWidth,
      parity_type: parityType,
      flip_positions: flipPositions,
    });
  },

  runExperiment: async (
    dataLength: number = 32,
    trials: number = 200,
    flipCount: number = 2,
    algorithms: string[] = ['parity-even', 'checksum', 'crc-8', 'crc-16'],
    seed: number = 42
  ): Promise<ErrorExperimentResult> => {
    return post<ErrorExperimentResult>('/error-detection/experiment', {
      data_length: dataLength,
      trials,
      flip_count: flipCount,
      algorithms,
      seed,
    });
  },
};
