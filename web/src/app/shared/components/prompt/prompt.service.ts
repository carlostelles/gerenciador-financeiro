import { Injectable } from '@angular/core';
import { TuiPopoverService } from '@taiga-ui/cdk';
import { TUI_DIALOGS } from '@taiga-ui/core';

import { Prompt } from './prompt.component';
import { type PromptOptions, type PromptButton } from './prompt-options';

@Injectable({
    providedIn: 'root',
    useFactory: () =>
        new PromptService(TUI_DIALOGS, Prompt, {
            heading: 'Você tem certeza disso?',
            buttons: [
                { label: 'Sim', appearance: 'primary' },
                { label: 'Não', appearance: 'secondary' }
            ],
        }),
})
export class PromptService extends TuiPopoverService<PromptOptions, boolean> { }
