import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ModalService } from '../services/modal.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css'],
})
export class NavComponent implements OnInit {
  @ViewChild('menu', { read: ElementRef, static: false }) menu?: ElementRef;

  constructor(public modal: ModalService, public auth: AuthService) {}

  ngOnInit(): void {}

  openModal($event: Event) {
    $event.preventDefault();
    this.modal.toggleModal('auth');
  }

  toggleMenu() {
    this.menu?.nativeElement.classList.toggle('hidden');
  }
}
