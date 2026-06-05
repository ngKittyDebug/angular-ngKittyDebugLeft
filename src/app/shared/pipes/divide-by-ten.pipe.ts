import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({
  name: 'leftPawDivideByTen',
})
export class DivideByTenPipe implements PipeTransform {
  transform(value: unknown): number {
    return Number(value) / 10;
  }
}
