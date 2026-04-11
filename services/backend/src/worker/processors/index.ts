import { ProcessorRegistry } from '../types.js';
import { emailSimulationProcessor } from './email-simulation.js';
import { imageProcessingSimulationProcessor } from './image-processing-simulation.js';
import { reportGenerationProcessor } from './report-generation.js';

export const processors: ProcessorRegistry = {
  email_simulation: emailSimulationProcessor,
  image_processing_simulation: imageProcessingSimulationProcessor,
  report_generation: reportGenerationProcessor,
};
