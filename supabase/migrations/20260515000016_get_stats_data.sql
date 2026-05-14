CREATE OR REPLACE FUNCTION get_stats_data(
  p_from       date,
  p_to         date,
  p_client_id  uuid DEFAULT NULL
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'shipouts',
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id',          s.id,
            'client_id',   s.client_id,
            'client_name', c.name,
            'created_at',  s.created_at,
            'items',
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'item_id',       grp.item_id,
                    'item_name',     grp.name_ko,
                    'category_id',   grp.category_id,
                    'category_name', grp.category_name,
                    'quantity',      grp.qty,
                    'unit_price',    COALESCE(
                      (
                        SELECT ip.unit_price
                        FROM   item_prices ip
                        WHERE  ip.item_id        = grp.item_id
                          AND  ip.effective_from <= grp.max_date
                        ORDER BY ip.effective_from DESC
                        LIMIT  1
                      ),
                      0
                    )
                  )
                )
                FROM (
                  SELECT
                    il.item_id,
                    i.name_ko,
                    i.category_id,
                    cat.name          AS category_name,
                    SUM(il.quantity)  AS qty,
                    MAX(il.processed_at)::date AS max_date
                  FROM inventory_logs il
                  JOIN items          i   ON i.id   = il.item_id
                  JOIN categories     cat ON cat.id = i.category_id
                  WHERE il.shipout_id     = s.id
                    AND il.log_type       = 'out'
                    AND il.processed_at::date BETWEEN p_from AND p_to
                  GROUP BY il.item_id, i.name_ko, i.category_id, cat.name
                ) grp
              ),
              '[]'::json
            )
          )
          ORDER BY s.created_at
        )
        FROM shipouts s
        JOIN clients  c ON c.id = s.client_id
        WHERE s.deleted_at IS NULL
          AND (p_client_id IS NULL OR s.client_id = p_client_id)
          AND EXISTS (
            SELECT 1
            FROM   inventory_logs il_chk
            WHERE  il_chk.shipout_id        = s.id
              AND  il_chk.log_type          = 'out'
              AND  il_chk.processed_at::date BETWEEN p_from AND p_to
          )
      ),
      '[]'::json
    )
  );
$$;
