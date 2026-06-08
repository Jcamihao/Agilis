import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

@Component({
  selector: 'ag-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  private readonly fb   = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  loading        = signal(false);
  error          = signal('');
  currentStep    = signal(1);
  lookingUpCep   = signal(false);
  cepError       = signal('');

  form = this.fb.group({
    // Step 1 — Dados pessoais
    name:     ['', [Validators.required, Validators.minLength(2)]],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],

    // Step 2 — Informações adicionais
    cpfCnpj:           [''],
    phone:             [''],
    cep:               [''],
    uf:                [''],
    address:           [''],
    addressNumber:     [''],
    addressComplement: [''],

    // Step 3 — Empresa
    companyName: [''],
  });

  // ── Step navigation ───────────────────────────────────────────────────────

  goToStep(step: number) {
    if (step === 2) {
      const { name, email, password } = this.form.controls;
      [name, email, password].forEach((c) => c.markAsTouched());
      if (name.invalid || email.invalid || password.invalid) return;
    }
    this.currentStep.set(step);
  }

  // ── CEP lookup ────────────────────────────────────────────────────────────

  onCepInput(event: Event) {
    let v = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
    this.form.get('cep')!.setValue(v, { emitEvent: false });

    const digits = v.replace(/\D/g, '');
    this.cepError.set('');
    if (digits.length !== 8) return;

    this.lookingUpCep.set(true);
    this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${digits}/json/`).subscribe({
      next: (data) => {
        this.lookingUpCep.set(false);
        if (data.erro) {
          this.cepError.set('CEP não encontrado.');
          return;
        }
        this.form.patchValue({
          uf:      data.uf      ?? '',
          address: data.logradouro ?? '',
        });
      },
      error: () => {
        this.lookingUpCep.set(false);
        this.cepError.set('Erro ao buscar CEP. Verifique sua conexão.');
      },
    });
  }

  // ── Masks ─────────────────────────────────────────────────────────────────

  onCpfCnpjInput(event: Event) {
    let v = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      v = v.slice(0, 14)
           .replace(/(\d{2})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d)/, '$1/$2')
           .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    this.form.get('cpfCnpj')!.setValue(v, { emitEvent: false });
  }

  onPhoneInput(event: Event) {
    let v = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    if (v.length <= 10) {
      v = v.replace(/(\d{2})(\d)/, '($1) $2')
           .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      v = v.slice(0, 11)
           .replace(/(\d{2})(\d)/, '($1) $2')
           .replace(/(\d{5})(\d)/, '$1-$2');
    }
    this.form.get('phone')!.setValue(v, { emitEvent: false });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const v = this.form.value;
    this.auth.register({
      name:             v.name!,
      email:            v.email!,
      password:         v.password!,
      companyName:      v.companyName   || undefined,
      phone:            v.phone         || undefined,
      cpfCnpj:          v.cpfCnpj       || undefined,
      cep:              v.cep           || undefined,
      uf:               v.uf            || undefined,
      address:          v.address       || undefined,
      addressNumber:    v.addressNumber || undefined,
      addressComplement:v.addressComplement || undefined,
    }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error.set(err?.error?.message || 'Erro ao criar conta');
        this.loading.set(false);
      },
    });
  }

  ctrl(name: string): AbstractControl { return this.form.get(name)!; }
  invalid(name: string): boolean { const c = this.ctrl(name); return c.invalid && c.touched; }
}
