export type Appearance = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';

export interface PromptOptions {
    readonly buttons: readonly PromptButton[];
    readonly heading: string;
}

export interface PromptButton {
    readonly label: string;
    readonly appearance: Appearance;
    readonly icon?: string;
}