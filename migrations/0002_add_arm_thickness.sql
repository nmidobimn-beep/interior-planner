-- ㄱ자형(lshape) 가구의 팔 두께(mm) 저장용 컬럼 추가. 사각형/원형은 NULL로 둔다.
ALTER TABLE furniture_library ADD COLUMN arm_thickness REAL;
