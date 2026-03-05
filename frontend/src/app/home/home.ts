import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../material/material-module';

function notBlank(control: AbstractControl): ValidationErrors | null {
  return control.value?.trim().length > 0 ? null : { blank: true };
}

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, MaterialModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  form = new FormGroup({
    firstname: new FormControl('', [Validators.required, notBlank]),
    lastname: new FormControl('', [Validators.required, notBlank]),
  });

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  post() {
    this.http.post('/api/person', this.form.value).subscribe({
      next: (res) => {
        this.snackBar.open(JSON.stringify(res), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-success'
        });
      },
      error: (e) => {
        this.snackBar.open(JSON.stringify(e.error), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-error'
        });
      }
    });
  }
}
