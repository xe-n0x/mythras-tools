import { ModalInnerContent } from './../../model/modal-inner-content';
import { TableComponent } from 'src/app/table-component/table.component';
import { HIT_LOCATIONS } from 'src/app/services/hit-points';
import { Component } from '@angular/core';

@Component({
  selector: 'app-hit-locations',
  templateUrl: '../../table-component/table.component.html',
  styleUrls: ['./hit-locations.component.scss']
})
export class HitLocationsComponent extends TableComponent implements ModalInnerContent {
  getHeader(): string {
    return "Human Hit Locations";
  }
  getSources(): string {
    return "Mythras Core Rules 109";
  }
  override getTable(): any[] {
    return HIT_LOCATIONS.map(({ range, label }) => ({ '1d20': range, 'Hit Location': label }));
  }
}
