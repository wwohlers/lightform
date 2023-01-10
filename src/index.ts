import { useCallback, useMemo, useState } from "react";

type Validator<K> = (value: unknown) => K;

type FormFields = Record<string, any>;

type FormItemData<K> = {
  value: K;
  error: string;
  validator: Validator<K>; // throws error if invalid
};

type FormData<K extends FormFields> = {
  [P in keyof K]: FormItemData<K[P]>;
};

type Validators<K extends FormFields> = {
  [P in keyof K]: Validator<K[P]>;
};

export function useForm<K extends FormFields>(
  initialState: K,
  validators: Partial<Validators<K>> = {}
) {
  const [state, setState] = useState<FormData<K>>(
    Object.fromEntries(
      Object.entries(initialState).map(([key, value]) => {
        const validator = validators[key] ?? ((val) => val);
        return [key, { value, error: "", validator }];
      })
    ) as FormData<K>
  );

  const onFieldChange = useCallback(
    (field: keyof K) => (value: K[typeof field]) => {
      const validator = state[field].validator;
      try {
        validator(value);
        setState((prevState) => ({
          ...prevState,
          [field]: {
            value,
            error: "",
            validator,
          },
        }));
      } catch (e) {
        setState((prevState) => ({
          ...prevState,
          [field]: {
            value,
            error: ((e) => {
              if (e instanceof Error) {
                return e.message;
              }
              return new String(e);
            })(e),
            validator,
          },
        }));
      }
    },
    [state]
  );

  const values = useMemo(() => {
    return Object.fromEntries(
      Object.entries(state).map(([key, value]) => {
        return [key, value.value];
      })
    ) as K;
  }, [state]);

  const errors = useMemo(() => {
    return Object.fromEntries(
      Object.entries(state).map(([key, value]) => {
        return [key, value.error];
      })
    ) as K;
  }, [state]);

  // must validate all fields instead of just checking if there are any errors
  // because error messages are always initialized to empty string
  const hasErrors = useMemo(() => {
    return Object.values(state).some((item) => {
      try {
        item.validator(item.value);
        return false;
      } catch (e) {
        return true;
      }
    });
  }, [state]);

  return { values, errors, onFieldChange, hasErrors };
}
