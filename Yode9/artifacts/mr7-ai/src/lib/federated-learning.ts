/**
 * Federated Learning Framework
 * Enables AI models to learn from user data without exposing sensitive information
 */

export interface ModelUpdate {
  modelId: string;
  weights: number[];
  metrics: {
    loss: number;
    accuracy: number;
    samplesTrained: number;
  };
  timestamp: number;
  version: number;
}

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
}

export class FederatedLearningFramework {
  private modelId: string;
  private localModel: number[] = [];
  private globalModelVersion: number = 0;
  private trainingHistory: ModelUpdate[] = [];

  constructor(modelId: string = 'default-model') {
    this.modelId = modelId;
    this.initializeModel();
  }

  private initializeModel(): void {
    // Initialize with random weights (simplified)
    const modelSize = 1000; // Simplified model size
    this.localModel = Array.from({ length: modelSize }, () => Math.random() * 2 - 1);
  }

  /**
   * Train local model on user data
   */
  async trainLocal(
    data: Array<{ input: number[]; output: number[] }>,
    config: TrainingConfig = {
      epochs: 5,
      batchSize: 32,
      learningRate: 0.001,
      validationSplit: 0.2,
    }
  ): Promise<ModelUpdate> {
    const startTime = Date.now();
    
    // Split data for training and validation
    const splitIndex = Math.floor(data.length * (1 - config.validationSplit));
    const trainData = data.slice(0, splitIndex);
    const validationData = data.slice(splitIndex);

    let currentWeights = [...this.localModel];
    let currentLoss = 1.0;
    let currentAccuracy = 0.0;

    // Training loop
    for (let epoch = 0; epoch < config.epochs; epoch++) {
      // Shuffle data
      const shuffled = [...trainData].sort(() => Math.random() - 0.5);

      // Mini-batch training
      for (let i = 0; i < shuffled.length; i += config.batchSize) {
        const batch = shuffled.slice(i, i + config.batchSize);
        const gradients = this.calculateGradients(currentWeights, batch);
        
        // Update weights using gradient descent
        currentWeights = currentWeights.map((w, idx) => 
          w - config.learningRate * gradients[idx]
        );
      }

      // Calculate metrics
      currentLoss = this.calculateLoss(currentWeights, validationData);
      currentAccuracy = this.calculateAccuracy(currentWeights, validationData);
    }

    this.localModel = currentWeights;
    this.globalModelVersion++;

    const update: ModelUpdate = {
      modelId: this.modelId,
      weights: currentWeights,
      metrics: {
        loss: currentLoss,
        accuracy: currentAccuracy,
        samplesTrained: trainData.length * config.epochs,
      },
      timestamp: startTime,
      version: this.globalModelVersion,
    };

    this.trainingHistory.push(update);

    return update;
  }

  private calculateGradients(
    weights: number[],
    batch: Array<{ input: number[]; output: number[] }>
  ): number[] {
    const gradients = new Array(weights.length).fill(0);
    
    for (const sample of batch) {
      // Simplified gradient calculation
      for (let i = 0; i < Math.min(weights.length, sample.input.length); i++) {
        gradients[i] += (weights[i] * sample.input[i] - sample.output[0]) * sample.input[i];
      }
    }

    // Average gradients
    return gradients.map(g => g / batch.length);
  }

  private calculateLoss(
    weights: number[],
    data: Array<{ input: number[]; output: number[] }>
  ): number {
    let totalLoss = 0;
    
    for (const sample of data) {
      const prediction = this.predict(weights, sample.input);
      const error = prediction - sample.output[0];
      totalLoss += error * error;
    }
    
    return totalLoss / data.length;
  }

  private calculateAccuracy(
    weights: number[],
    data: Array<{ input: number[]; output: number[] }>
  ): number {
    let correct = 0;
    
    for (const sample of data) {
      const prediction = this.predict(weights, sample.input);
      const predictedClass = prediction > 0.5 ? 1 : 0;
      const actualClass = sample.output[0] > 0.5 ? 1 : 0;
      
      if (predictedClass === actualClass) {
        correct++;
      }
    }
    
    return correct / data.length;
  }

  private predict(weights: number[], input: number[]): number {
    // Simplified linear model
    let sum = 0;
    for (let i = 0; i < Math.min(weights.length, input.length); i++) {
      sum += weights[i] * input[i];
    }
    
    // Sigmoid activation
    return 1 / (1 + Math.exp(-sum));
  }

  /**
   * Aggregate updates from multiple clients (server-side)
   */
  async aggregateUpdates(updates: ModelUpdate[]): Promise<number[]> {
    if (updates.length === 0) {
      return this.localModel;
    }

    const modelSize = updates[0].weights.length;
    const aggregated = new Array(modelSize).fill(0);

    // Average all weight updates (FedAvg algorithm)
    for (const update of updates) {
      for (let i = 0; i < modelSize; i++) {
        aggregated[i] += update.weights[i];
      }
    }

    for (let i = 0; i < modelSize; i++) {
      aggregated[i] /= updates.length;
    }

    this.localModel = aggregated;
    this.globalModelVersion++;

    return aggregated;
  }

  /**
   * Get local model for prediction
   */
  getModel(): number[] {
    return [...this.localModel];
  }

  /**
   * Predict using local model
   */
  async predictLocal(input: number[]): Promise<number> {
    return this.predict(this.localModel, input);
  }

  /**
   * Get training history
   */
  getTrainingHistory(): ModelUpdate[] {
    return [...this.trainingHistory];
  }

  /**
   * Export model weights for sharing
   */
  exportModel(): { weights: number[]; version: number; modelId: string } {
    return {
      weights: [...this.localModel],
      version: this.globalModelVersion,
      modelId: this.modelId,
    };
  }

  /**
   * Import model weights from global model
   */
  importModel(weights: number[], version: number): void {
    if (version > this.globalModelVersion) {
      this.localModel = [...weights];
      this.globalModelVersion = version;
    }
  }

  /**
   * Get model statistics
   */
  getModelStats(): {
    modelId: string;
    version: number;
    modelSize: number;
    trainingRounds: number;
    avgLoss: number;
    avgAccuracy: number;
  } {
    const avgLoss = this.trainingHistory.length > 0
      ? this.trainingHistory.reduce((sum, u) => sum + u.metrics.loss, 0) / this.trainingHistory.length
      : 0;
    
    const avgAccuracy = this.trainingHistory.length > 0
      ? this.trainingHistory.reduce((sum, u) => sum + u.metrics.accuracy, 0) / this.trainingHistory.length
      : 0;

    return {
      modelId: this.modelId,
      version: this.globalModelVersion,
      modelSize: this.localModel.length,
      trainingRounds: this.trainingHistory.length,
      avgLoss,
      avgAccuracy,
    };
  }
}

// Singleton instance
let federatedFramework: FederatedLearningFramework | null = null;

export function getFederatedFramework(): FederatedLearningFramework {
  if (!federatedFramework) {
    federatedFramework = new FederatedLearningFramework();
  }
  return federatedFramework;
}
