// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

afterEach(cleanup);
import { NumberField } from '../../src/components/fields/NumberField';
import { TextField } from '../../src/components/fields/TextField';
import { SelectField } from '../../src/components/fields/SelectField';
import { CheckboxField } from '../../src/components/fields/CheckboxField';
import { ColorField } from '../../src/components/fields/ColorField';
import { PropertyGroup } from '../../src/components/fields/PropertyGroup';

describe('NumberField', () => {
  it('renders label and value', () => {
    render(<NumberField label="X" value={42} onChange={() => {}} />);
    expect(screen.getByText('X')).toBeTruthy();
    expect(screen.getByDisplayValue('42')).toBeTruthy();
  });

  it('commits value on blur', () => {
    const onChange = vi.fn();
    render(<NumberField label="X" value={10} onChange={onChange} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it('returns undefined for empty value', () => {
    const onChange = vi.fn();
    render(<NumberField label="X" value={10} onChange={onChange} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('clamps to min', () => {
    const onChange = vi.fn();
    render(<NumberField label="X" value={10} onChange={onChange} min={5} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('clamps to max', () => {
    const onChange = vi.fn();
    render(<NumberField label="X" value={10} onChange={onChange} max={20} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(20);
  });
});

describe('TextField', () => {
  it('renders label and value', () => {
    render(<TextField label="Name" value="test" onChange={() => {}} />);
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByDisplayValue('test')).toBeTruthy();
  });

  it('commits value on blur', () => {
    const onChange = vi.fn();
    render(<TextField label="Name" value="old" onChange={onChange} />);
    const input = screen.getByDisplayValue('old');
    fireEvent.change(input, { target: { value: 'new' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('new');
  });

  it('returns undefined for empty value', () => {
    const onChange = vi.fn();
    render(<TextField label="Name" value="test" onChange={onChange} />);
    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('renders multiline textarea', () => {
    render(<TextField label="Desc" value="hello" onChange={() => {}} multiline />);
    const textarea = screen.getByDisplayValue('hello');
    expect(textarea.tagName).toBe('TEXTAREA');
  });
});

describe('SelectField', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  it('renders options', () => {
    render(<SelectField label="Type" value="a" onChange={() => {}} options={options} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('commits on change immediately', () => {
    const onChange = vi.fn();
    render(<SelectField label="Type" value="a" onChange={onChange} options={options} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('returns undefined for empty selection when allowEmpty', () => {
    const onChange = vi.fn();
    render(
      <SelectField label="Style" value="a" onChange={onChange} options={options} allowEmpty />,
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});

describe('CheckboxField', () => {
  it('renders checked state', () => {
    render(<CheckboxField label="Auto" value={true} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it('toggles on click', () => {
    const onChange = vi.fn();
    render(<CheckboxField label="Auto" value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('ColorField', () => {
  it('renders swatch and hex input', () => {
    render(<ColorField label="Color" value="#ff0000" onChange={() => {}} />);
    const inputs = screen.getAllByDisplayValue('#ff0000');
    expect(inputs.length).toBe(2); // swatch + text input
  });

  it('commits hex text on blur', () => {
    const onChange = vi.fn();
    render(<ColorField label="Color" value="#ff0000" onChange={onChange} />);
    // Text input is type="text", swatch is type="color"
    const textInput = screen.getByPlaceholderText('#000000');
    fireEvent.change(textInput, { target: { value: '#00ff00' } });
    fireEvent.blur(textInput);
    expect(onChange).toHaveBeenCalledWith('#00ff00');
  });
});

describe('PropertyGroup', () => {
  it('renders expanded by default', () => {
    render(
      <PropertyGroup label="Layout">
        <div data-testid="content">Hello</div>
      </PropertyGroup>,
    );
    expect(screen.getByText('Layout')).toBeTruthy();
    expect(screen.getByTestId('content')).toBeTruthy();
  });

  it('collapses on click', () => {
    render(
      <PropertyGroup label="Layout">
        <div data-testid="content">Hello</div>
      </PropertyGroup>,
    );
    fireEvent.click(screen.getByText('Layout'));
    expect(screen.queryByTestId('content')).toBeNull();
  });

  it('starts collapsed when defaultOpen is false', () => {
    render(
      <PropertyGroup label="Advanced" defaultOpen={false}>
        <div data-testid="content">Hello</div>
      </PropertyGroup>,
    );
    expect(screen.queryByTestId('content')).toBeNull();
  });
});
