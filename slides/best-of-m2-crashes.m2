-------------------------------
-- Best of Macaulay2 crashes --
-------------------------------
-- Doug Torrance, Piedmont University
-- M2internals
-- Sep. 2, 2021

-- During the Macaulay2 build process, we run a lot
-- of M2 code:
-- * examples for documentation
-- * tests
-- Sometimes we get crashes!

-- Failing examples:
-- Use cached examples instead
load "generate-examples.m2"
-- script in Debian source package
-- https://salsa.debian.org/science-team/macaulay2
generateExample("Graphs", "cycleGraph",
    "~/src/macaulay2/M2/debian")

-- Failing package tests:
-- Skip them with "no-check-flag" comment
TEST "assert false"
check User
restart
TEST "-* no-check-flag *- assert false"
check User

--------------------
-- Common crashes --
--------------------

-- #1742 - lines 709 & 787 in e/monideal.cpp
-- e.g., Github action #2261

code (tests("SpecialFanoFourfolds"))#3
for i from 1 to 21 do (
    A = GMtables(i,ZZ/65521);
    time specialGushelMukaiFourfold(
	(rationalMap(ideal A_0,Dominant=>2)
	    ) ideal A_1,InputCheck=>0))

-- #1903 - check(30, "AssociativeAlgebras")
-- e.g., Github action #2264
code (tests("AssociativeAlgebras"))#30
i = 0
while true do (
    print("attempt #" | i | " ..."); i = i + 1;
    kk = toField(QQ[x]/(x^2+x+1));
    R = kk<|y_1,y_2,y_3|>;
    S = skewPolynomialRing(kk,(-1)_kk,{z_1,z_2,z_3});
    f_1 = z_1 + z_2 + z_3;
    f_2 = z_1 + x^2*z_2 + x*z_3;
    f_3 = z_1 + x*z_2 + x^2*z_3;
    phi = map(S,R,{f_1,f_2,f_3});
    graphPhi = ncGraphIdeal phi;
    use ring graphPhi;
    graphPhiGB = NCGB(graphPhi,10,Strategy=>"F4");
    preim = NCReductionTwoSided(z_1^2*z_2^3*z_3,
    	ideal graphPhiGB);
    alpha = map(S,
	ring graphPhi,gens S | {f_1,f_2,f_3});
    print(alpha(preim) == alpha(z_1^2*z_2^3*z_3)))

-- #2162 - mathicgb F4 algorithm strangeness
-- so far, just on armhf and s390x machines
debug needsPackage "SpecialFanoFourfolds";
discriminant specialGushelMukaiFourfold(
    last exampleD44data(ZZ/65521), InputCheck => 0)

needsPackage "SparseResultants";
denseResultant(2,2,1,CoefficientRing=>ZZ/331)

-- to s390x porterbox!
