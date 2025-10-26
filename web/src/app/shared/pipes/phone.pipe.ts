import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phone',
  standalone: true
})
export class PhonePipe implements PipeTransform {

  formatPhone(phone: string): string {
    // Format phone from 5511999999999 to +55 (11) 99999-9999
    const COUNTRY_CODE_END = 2;
    const AREA_CODE_START = COUNTRY_CODE_END;
    const AREA_CODE_END = AREA_CODE_START + 2;
    const FIRST_PART_START = AREA_CODE_END;
    const FIRST_PART_END = FIRST_PART_START + 5;
    const SECOND_PART_START = FIRST_PART_END;

    if (phone?.length === 13) {
      return `+${phone.slice(0, COUNTRY_CODE_END)} (${phone.slice(AREA_CODE_START, AREA_CODE_END)}) ${phone.slice(FIRST_PART_START, FIRST_PART_END)}-${phone.slice(SECOND_PART_START)}`;
    }
    return phone;
  }
  
  transform(
    value: string | null | undefined
  ): string {
    if (!value) {
      return '';
    }

    return this.formatPhone(value);
  }
}