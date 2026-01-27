import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { Field, TextInput } from '@strapi/design-system';

export const Input = React.forwardRef<HTMLInputElement, any>((props, ref) => {
  const {
    attribute,
    disabled,
    intlLabel,
    name,
    onChange,
    required,
    value,
    error,
    placeholder,
    hint,
    label,
  } = props as any;

  const { formatMessage } = useIntl();
  // Lokale kommagetrennte Darstellung
  const [display, setDisplay] = useState('');
  const isInternalChange = useRef(false);

  // Wenn value sich ändert, aktualisiere display (nur wenn von außen gesetzt, nicht bei eigener Eingabe)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (typeof value === 'number' && value !== null && value !== undefined && value !== 0) {
      // Umwandlung: Cent → Euro mit Komma
      const euros = (value / 100).toFixed(2).replace('.', ',');
      setDisplay(euros);
    } else if (value === null || value === undefined || value === 0) {
      // Wenn value 0, null oder undefined ist, lasse das Feld leer
      setDisplay('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.currentTarget.value;

    // Wenn leer, zurücksetzen
    if (input === '') {
      setDisplay('');
      // Markiere als interne Änderung, damit useEffect nicht "0,00" anzeigt
      isInternalChange.current = true;
      // Setze auf null statt 0, damit das Feld leer bleibt
      onChange({
        target: { name, type: attribute.type, value: null as any },
      });
      return;
    }

    // Sanitization: nur Zahlen, Komma oder Punkt
    input = input.replace(/[^\d,.]/g, '');

    // Punkt als Dezimaltrennzeichen durch Komma ersetzen
    input = input.replace(/\./g, ',');

    // Mehrere Kommas entfernen - nur das erste behalten
    const commaIndex = input.indexOf(',');
    if (commaIndex !== -1) {
      input =
        input.substring(0, commaIndex + 1) + input.substring(commaIndex + 1).replace(/,/g, '');
    }

    // Zeige genau das, was der Benutzer eingibt (nach Sanitization)
    setDisplay(input);

    // Berechne im Hintergrund die Cent-Werte
    const [eurosPart, centsPart] = input.split(',');

    // Euro-Teil: nur Ziffern
    const eurosStr = eurosPart.replace(/\D/g, '') || '0';
    const eurosNum = parseInt(eurosStr, 10);

    // Cent-Teil: nur Ziffern, maximal 2 Stellen für die Berechnung
    let cents = 0;
    if (centsPart !== undefined && centsPart.length > 0) {
      const centsStr = centsPart.replace(/\D/g, '').slice(0, 2);
      cents = parseInt(centsStr || '0', 10);
    }

    // Berechne Gesamt-Cent
    const totalCents = eurosNum * 100 + cents;

    // Markiere als interne Änderung, damit useEffect nicht überschreibt
    isInternalChange.current = true;

    // Rufe onChange mit integer und type "integer" auf
    onChange({
      target: { name, type: attribute.type, value: totalCents },
    });
  };

  // formatMessage requires a MessageDescriptor with an "id". Without an id, @formatjs/intl throws in production.
  const safeFormat = (descriptor: unknown): string | undefined => {
    if (descriptor == null) return undefined;
    if (typeof descriptor === 'string') return descriptor;
    if (
      typeof descriptor === 'object' &&
      descriptor !== null &&
      'id' in descriptor &&
      typeof (descriptor as { id: string }).id === 'string'
    ) {
      return formatMessage(descriptor as { id: string; defaultMessage?: string });
    }
    if (
      typeof descriptor === 'object' &&
      descriptor !== null &&
      'defaultMessage' in descriptor &&
      typeof (descriptor as { defaultMessage: string }).defaultMessage === 'string'
    ) {
      return (descriptor as { defaultMessage: string }).defaultMessage;
    }
    return undefined;
  };

  const placeholderText = placeholder ? (safeFormat(placeholder) ?? '0,00') : '0,00';
  // Verwende label Prop (falls vorhanden), sonst intlLabel, sonst name
  const fieldLabel = label || (intlLabel && intlLabel.id ? formatMessage(intlLabel) : name);
  const errorMessage = error ? (typeof error === 'string' ? error : error.message) : undefined;

  return (
    <Field.Root
      name={name}
      required={required}
      error={errorMessage}
      hint={hint ? safeFormat(hint) : undefined}
    >
      <Field.Label>{fieldLabel}</Field.Label>
      <TextInput
        ref={ref}
        name={name}
        disabled={disabled}
        value={display}
        onChange={handleChange}
        placeholder={placeholderText}
      />
      <Field.Error />
      <Field.Hint />
    </Field.Root>
  );
});

Input.displayName = 'PriceInput';
