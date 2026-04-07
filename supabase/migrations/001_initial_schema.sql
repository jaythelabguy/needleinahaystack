-- Profiles table (linked to auth.users, includes admin role)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user', -- 'user' or 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  graduation_year INT NOT NULL,
  gpa DECIMAL(3,2),
  sat_score INT,
  act_score INT,
  state TEXT,
  city TEXT,
  ethnicity TEXT[],
  gender TEXT,
  citizenship TEXT DEFAULT 'US',
  financial_need BOOLEAN DEFAULT false,
  intended_major TEXT,
  intended_school TEXT,
  extracurriculars JSONB DEFAULT '[]',
  sports TEXT[],
  awards JSONB DEFAULT '[]',
  volunteer_hours INT,
  work_experience JSONB DEFAULT '[]',
  interests TEXT[],
  essay_topics TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own students" ON students
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Scholarships table
CREATE TABLE scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT,
  amount_min INT,
  amount_max INT,
  amount_description TEXT,
  deadline DATE,
  url TEXT NOT NULL,
  description TEXT,
  eligibility JSONB DEFAULT '{}',
  requirements TEXT[],
  renewable BOOLEAN DEFAULT false,
  renewable_details TEXT,
  category TEXT[],
  source TEXT,
  source_id TEXT,
  status TEXT DEFAULT 'active',
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);

-- Scholarships are readable by all authenticated users
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read scholarships" ON scholarships
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage scholarships" ON scholarships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Scholarship matches table
CREATE TABLE scholarship_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  scholarship_id UUID REFERENCES scholarships(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2),
  eligible BOOLEAN,
  match_reasons TEXT[],
  disqualifiers TEXT[],
  status TEXT DEFAULT 'new',
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, scholarship_id)
);

ALTER TABLE scholarship_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own matches" ON scholarship_matches
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Users update own matches" ON scholarship_matches
  FOR UPDATE USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scholarships_updated_at BEFORE UPDATE ON scholarships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON scholarship_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
