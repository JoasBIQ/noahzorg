-- DELETE policies voor agenda (ontbraken)
CREATE POLICY "agenda_delete_own" ON agenda FOR DELETE TO authenticated USING (aangemaakt_door = auth.uid());
CREATE POLICY "agenda_delete_admin" ON agenda FOR DELETE TO authenticated USING (is_beheerder());
