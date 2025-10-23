import { Pipe, PipeTransform } from '@angular/core';
import { formatPeriod } from '../helpers';

@Pipe({
  name: 'formatPeriod',
  standalone: true
})
export class FormatPeriodPipe implements PipeTransform {

  transform(
    value: string | null | undefined
  ): string {
    if (value === null || value === undefined) {
      return '';
    }

    return formatPeriod(value);
  }
}