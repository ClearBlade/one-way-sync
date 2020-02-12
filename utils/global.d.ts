interface PromiseConstructor {
    runQueue: () => void;
}

declare const log: { (s: unknown): void };
