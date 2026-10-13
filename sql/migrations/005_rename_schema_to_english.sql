-- Upgrade databases created before the English identifier refactor.
DO $$
BEGIN
    IF to_regtype('categorie_produs') IS NOT NULL
       AND to_regtype('product_category') IS NULL THEN
        ALTER TYPE categorie_produs RENAME TO product_category;
    END IF;
END
$$;

DO $$
BEGIN
    IF to_regtype('product_category') IS NOT NULL THEN
        BEGIN
            ALTER TYPE product_category RENAME VALUE 'incaltaminte' TO 'footwear';
        EXCEPTION WHEN duplicate_object OR invalid_parameter_value THEN NULL;
        END;
        BEGIN
            ALTER TYPE product_category RENAME VALUE 'imbracaminte' TO 'clothing';
        EXCEPTION WHEN duplicate_object OR invalid_parameter_value THEN NULL;
        END;
        BEGIN
            ALTER TYPE product_category RENAME VALUE 'accesorii' TO 'accessories';
        EXCEPTION WHEN duplicate_object OR invalid_parameter_value THEN NULL;
        END;
        BEGIN
            ALTER TYPE product_category RENAME VALUE 'antrenament' TO 'training';
        EXCEPTION WHEN duplicate_object OR invalid_parameter_value THEN NULL;
        END;
        BEGIN
            ALTER TYPE product_category RENAME VALUE 'spectacol' TO 'performance';
        EXCEPTION WHEN duplicate_object OR invalid_parameter_value THEN NULL;
        END;
    END IF;
END
$$;

DO $$
DECLARE
    old_table TEXT;
    new_table TEXT;
BEGIN
    FOREACH old_table IN ARRAY ARRAY['produse', 'clienti', 'comenzi', 'articole_comanda', 'utilizatori', 'sesiuni']
    LOOP
        new_table := CASE old_table
            WHEN 'produse' THEN 'products'
            WHEN 'clienti' THEN 'customers'
            WHEN 'comenzi' THEN 'orders'
            WHEN 'articole_comanda' THEN 'order_items'
            WHEN 'utilizatori' THEN 'users'
            WHEN 'sesiuni' THEN 'sessions'
        END;
        IF to_regclass(old_table) IS NOT NULL AND to_regclass(new_table) IS NULL THEN
            EXECUTE format('ALTER TABLE %I RENAME TO %I', old_table, new_table);
        END IF;
    END LOOP;
END
$$;

DO $$
DECLARE
    current_table TEXT;
    old_column TEXT;
    new_column TEXT;
BEGIN
    FOREACH current_table IN ARRAY ARRAY['products', 'customers', 'orders', 'order_items', 'users', 'sessions']
    LOOP
        FOREACH old_column IN ARRAY ARRAY[
            'nume', 'descriere', 'imagine', 'categorie', 'subcategorie',
            'pret', 'nivel_experienta', 'data_adaugare', 'culoare', 'materiale',
            'personalizabil', 'stoc', 'recomandare_lena', 'detalii', 'intretinere',
            'client_id', 'utilizator_id', 'comanda_id', 'produs_id', 'nume_produs',
            'pret_unitar', 'cantitate', 'livrare', 'metoda_livrare', 'metoda_plata',
            'observatii', 'parola_hash', 'rol', 'activ', 'expira_la', 'creat_la',
            'creata_la', 'cod_postal'
        ]
        LOOP
            new_column := CASE old_column
                WHEN 'nume' THEN 'name'
                WHEN 'descriere' THEN 'description'
                WHEN 'imagine' THEN 'image'
                WHEN 'categorie' THEN 'category'
                WHEN 'subcategorie' THEN 'subcategory'
                WHEN 'pret' THEN 'price'
                WHEN 'nivel_experienta' THEN 'experience_level'
                WHEN 'data_adaugare' THEN 'added_at'
                WHEN 'culoare' THEN 'color'
                WHEN 'materiale' THEN 'materials'
                WHEN 'personalizabil' THEN 'customizable'
                WHEN 'stoc' THEN 'stock'
                WHEN 'recomandare_lena' THEN 'recommendation'
                WHEN 'detalii' THEN 'details'
                WHEN 'intretinere' THEN 'care'
                WHEN 'client_id' THEN 'customer_id'
                WHEN 'utilizator_id' THEN 'user_id'
                WHEN 'comanda_id' THEN 'order_id'
                WHEN 'produs_id' THEN 'product_id'
                WHEN 'nume_produs' THEN 'product_name'
                WHEN 'pret_unitar' THEN 'unit_price'
                WHEN 'cantitate' THEN 'quantity'
                WHEN 'livrare' THEN 'shipping'
                WHEN 'metoda_livrare' THEN 'shipping_method'
                WHEN 'metoda_plata' THEN 'payment_method'
                WHEN 'observatii' THEN 'notes'
                WHEN 'parola_hash' THEN 'password_hash'
                WHEN 'rol' THEN 'role'
                WHEN 'activ' THEN 'active'
                WHEN 'expira_la' THEN 'expires_at'
                WHEN 'creat_la' THEN 'created_at'
                WHEN 'creata_la' THEN 'created_at'
                WHEN 'cod_postal' THEN 'postal_code'
            END;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE information_schema.columns.table_name = current_table
                  AND information_schema.columns.column_name = old_column
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE information_schema.columns.table_name = current_table
                  AND information_schema.columns.column_name = new_column
            ) THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', current_table, old_column, new_column);
            END IF;
        END LOOP;
    END LOOP;
END
$$;
