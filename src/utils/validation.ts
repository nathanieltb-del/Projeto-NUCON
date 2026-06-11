/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Valida o formato e os dígitos verificadores de um CNPJ brasileiro.
 */
export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres não-numéricos
  const limpo = cnpj.replace(/[^\d]/g, '');

  // CNPJ deve ter 14 dígitos
  if (limpo.length !== 14) return false;

  // Elimina CNPJs com todos os dígitos iguais (ex: 11111111111111)
  if (/^(\d)\1{13}$/.test(limpo)) return false;

  // Validação dos dígitos verificadores
  let tamanho = limpo.length - 2;
  let numeros = limpo.substring(0, tamanho);
  const digitos = limpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = limpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

/**
 * Formata um número bruto em CNPJ (XX.XXX.XXX/XXXX-XX)
 */
export function formatarCNPJ(v: string): string {
  const r = v.replace(/\D/g, '');
  if (r.length <= 2) return r;
  if (r.length <= 5) return `${r.slice(0, 2)}.${r.slice(2)}`;
  if (r.length <= 8) return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5)}`;
  if (r.length <= 12) return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5, 8)}/${r.slice(8)}`;
  return `${r.slice(0, 2)}.${r.slice(2, 5)}.${r.slice(5, 8)}/${r.slice(8, 12)}-${r.slice(12, 14)}`;
}

/**
 * Valida o formato do Processo SEI: XXXXX-XXXXXXXX/XXXX-XX
 * que são: 5 dígitos - 8 dígitos / 4 dígitos - 2 dígitos
 */
export function validarProcessoSEI(sei: string): boolean {
  const regex = /^\d{5}-\d{8}\/\d{4}-\d{2}$/;
  return regex.test(sei);
}

/**
 * Formata entrada em formato Processo SEI
 */
export function formatarSEI(v: string): string {
  const r = v.replace(/\D/g, '');
  if (r.length <= 5) return r;
  if (r.length <= 13) return `${r.slice(0, 5)}-${r.slice(5)}`;
  if (r.length <= 17) return `${r.slice(0, 5)}-${r.slice(5, 13)}/${r.slice(13)}`;
  return `${r.slice(0, 5)}-${r.slice(5, 13)}/${r.slice(13, 17)}-${r.slice(17, 19)}`;
}

/**
 * Formata um número para moeda local BRL (R$)
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata uma data ISO em string brasileira DD/MM/AAAA ou DD/MM/AAAA HH:MM
 */
export function formatarDataHora(dataIso: string, incluirHora: boolean = true): string {
  if (!dataIso) return '-';
  const data = new Date(dataIso);
  if (isNaN(data.getTime())) return dataIso;
  
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  
  if (!incluirHora) {
    return `${dia}/${mes}/${ano}`;
  }
  
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
}

/**
 * Formata a competência de AAAA-MM para MM/AAAA
 */
export function formatarCompetencia(comp: string): string {
  if (!comp || !comp.includes('-')) return comp;
  const parts = comp.split('-');
  return `${parts[1]}/${parts[0]}`;
}
