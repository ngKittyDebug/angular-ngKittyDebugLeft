import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({
  name: 'leftPawPercentage',
})
export class PercentagePipe implements PipeTransform {
  transform(value: unknown, max = 255): number {
    const numberValue = Number(value);
    const numberMax = Number(max);

    if (isNaN(numberValue) || isNaN(numberMax) || numberMax === 0) {
      return 0;
    }

    return (numberValue / numberMax) * 100;
  }
}
